import { and, eq, lte, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { pushReminderDeliveries, recurringItems, refundTrackers } from "@/db/schema";
import { getEffectiveRecurringDate, type DateShiftPolicy } from "@/domain/date-shift";
import { listPendingCardRepaymentsForUser } from "@/features/credit-cards/data";
import { getConfiguredUsers } from "@/lib/auth";
import { addDays, nowIso, todayIsoDate } from "@/lib/dates";
import { sendPushToUser } from "./web-push";

const RECURRING_LOOKAHEAD_DAYS = 14;

type ReminderType = "recurring" | "cardRepayment" | "refund";
type ReminderStage = "first_seen" | "due_today";

type ReminderCandidate = {
  reminderKey: string;
  stage: ReminderStage;
  type: ReminderType;
  label: string;
  dueDate: string | null;
};

export type DailyReminderResult = {
  ownerUserId: string;
  attempted: number;
  sent: number;
  reminders: number;
};

const typeLabels: Record<ReminderType, string> = {
  recurring: "周期项",
  cardRepayment: "信用卡还款",
  refund: "退款",
};

export async function sendDailyRemindersForAllUsers(today = todayIsoDate()) {
  const users = getConfiguredUsers();
  const results: DailyReminderResult[] = [];

  for (const user of users) {
    results.push(await sendDailyReminderForUser(user.id, today));
  }

  return results;
}

export async function sendDailyReminderForUser(
  ownerUserId: string,
  today = todayIsoDate(),
): Promise<DailyReminderResult> {
  const candidates = await listUnsentReminderCandidates(ownerUserId, today);
  if (candidates.length === 0) {
    return { ownerUserId, attempted: 0, sent: 0, reminders: 0 };
  }

  const uniqueReminderKeys = new Set(candidates.map((candidate) => candidate.reminderKey));
  const result = await sendPushToUser(ownerUserId, {
    title: `FlowLedger 有 ${uniqueReminderKeys.size} 项待办`,
    body: formatReminderBody(candidates),
    url: "/",
    tag: `flowledger-daily-${today}`,
  });

  if (result.sent > 0) {
    await markReminderCandidatesSent(ownerUserId, candidates);
  }

  return {
    ownerUserId,
    attempted: result.attempted,
    sent: result.sent,
    reminders: uniqueReminderKeys.size,
  };
}

async function listUnsentReminderCandidates(ownerUserId: string, today: string) {
  const candidates = await listReminderCandidates(ownerUserId, today);
  if (candidates.length === 0) return [];

  const delivered = await db
    .select({
      reminderKey: pushReminderDeliveries.reminderKey,
      stage: pushReminderDeliveries.stage,
    })
    .from(pushReminderDeliveries)
    .where(eq(pushReminderDeliveries.ownerUserId, ownerUserId));
  const deliveredSet = new Set(delivered.map((item) => `${item.reminderKey}:${item.stage}`));

  return candidates.filter(
    (candidate) => !deliveredSet.has(`${candidate.reminderKey}:${candidate.stage}`),
  );
}

async function listReminderCandidates(
  ownerUserId: string,
  today: string,
): Promise<ReminderCandidate[]> {
  const [recurring, refunds, cardRepayments] = await Promise.all([
    listRecurringReminderCandidates(ownerUserId, today),
    listRefundReminderCandidates(ownerUserId, today),
    listCardRepaymentReminderCandidates(ownerUserId, today),
  ]);

  return [...recurring, ...cardRepayments, ...refunds];
}

async function listRecurringReminderCandidates(ownerUserId: string, today: string) {
  const cutoff = addDays(today, RECURRING_LOOKAHEAD_DAYS);
  const rows = await db
    .select({
      id: recurringItems.id,
      name: recurringItems.name,
      type: recurringItems.type,
      nextDate: recurringItems.nextDate,
      dateShiftPolicy: recurringItems.dateShiftPolicy,
    })
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.enabled, true),
        eq(recurringItems.ownerUserId, ownerUserId),
        lte(recurringItems.nextDate, cutoff),
      ),
    );

  const candidates: ReminderCandidate[] = [];
  for (const row of rows) {
    const dueDate = getEffectiveRecurringDate({
      type: row.type,
      nextDate: row.nextDate,
      dateShiftPolicy: row.dateShiftPolicy as DateShiftPolicy,
    });
    if (dueDate > today) continue;

    const reminderKey = `recurring:${row.id}:${dueDate}`;
    candidates.push({
      reminderKey,
      stage: "first_seen",
      type: "recurring",
      label: row.name,
      dueDate,
    });
    if (dueDate === today) {
      candidates.push({
        reminderKey,
        stage: "due_today",
        type: "recurring",
        label: row.name,
        dueDate,
      });
    }
  }

  return candidates;
}

async function listRefundReminderCandidates(ownerUserId: string, today: string) {
  const rows = await db
    .select({
      id: refundTrackers.id,
      expectedOn: refundTrackers.expectedOn,
    })
    .from(refundTrackers)
    .where(
      and(
        ne(refundTrackers.status, "received"),
        ne(refundTrackers.status, "cancelled"),
        eq(refundTrackers.ownerUserId, ownerUserId),
      ),
    );

  const candidates: ReminderCandidate[] = [];
  for (const row of rows) {
    const reminderKey = `refund:${row.id}`;
    candidates.push({
      reminderKey,
      stage: "first_seen",
      type: "refund",
      label: "退款追踪",
      dueDate: row.expectedOn,
    });
    if (row.expectedOn === today) {
      candidates.push({
        reminderKey,
        stage: "due_today",
        type: "refund",
        label: "退款追踪",
        dueDate: row.expectedOn,
      });
    }
  }

  return candidates;
}

async function listCardRepaymentReminderCandidates(ownerUserId: string, today: string) {
  const repayments = await listPendingCardRepaymentsForUser(ownerUserId, today);
  const candidates: ReminderCandidate[] = [];

  for (const repayment of repayments) {
    const reminderKey = `card-repayment:${repayment.cardId}:${repayment.periodEnd}`;
    candidates.push({
      reminderKey,
      stage: "first_seen",
      type: "cardRepayment",
      label: repayment.cardName,
      dueDate: repayment.dueDate,
    });
    if (repayment.dueDate === today) {
      candidates.push({
        reminderKey,
        stage: "due_today",
        type: "cardRepayment",
        label: repayment.cardName,
        dueDate: repayment.dueDate,
      });
    }
  }

  return candidates;
}

async function markReminderCandidatesSent(ownerUserId: string, candidates: ReminderCandidate[]) {
  const sentAt = nowIso();
  const unique = new Map<string, ReminderCandidate>();
  for (const candidate of candidates) {
    unique.set(`${candidate.reminderKey}:${candidate.stage}`, candidate);
  }

  for (const candidate of unique.values()) {
    await db
      .insert(pushReminderDeliveries)
      .values({
        ownerUserId,
        reminderKey: candidate.reminderKey,
        stage: candidate.stage,
        sentAt,
      })
      .onConflictDoNothing();
  }
}

function formatReminderBody(candidates: ReminderCandidate[]) {
  const uniqueByKey = new Map<string, ReminderCandidate>();
  const dueTodayKeys = new Set<string>();

  for (const candidate of candidates) {
    uniqueByKey.set(candidate.reminderKey, candidate);
    if (candidate.stage === "due_today") {
      dueTodayKeys.add(candidate.reminderKey);
    }
  }

  const counts = new Map<ReminderType, number>();
  for (const candidate of uniqueByKey.values()) {
    counts.set(candidate.type, (counts.get(candidate.type) ?? 0) + 1);
  }

  const summary = [...counts.entries()]
    .map(([type, count]) => `${typeLabels[type]} ${count} 项`)
    .join("，");
  const dueTodayCount = dueTodayKeys.size;

  return dueTodayCount > 0 ? `${summary}；其中 ${dueTodayCount} 项今天到期` : summary;
}
