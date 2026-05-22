import dayjs, { type Dayjs } from "dayjs";

export type DateLike = string | number | Date | Dayjs;

export const ISO_DATE = "YYYY-MM-DD";

export function todayIsoDate(): string {
  return dayjs().format(ISO_DATE);
}

export function nowIso(): string {
  return dayjs().toISOString();
}

export function toIsoDate(value: DateLike): string {
  return dayjs(value).format(ISO_DATE);
}

export function addMonths(value: DateLike, months: number): string {
  return dayjs(value).add(months, "month").format(ISO_DATE);
}

export function addDays(value: DateLike, days: number): string {
  return dayjs(value).add(days, "day").format(ISO_DATE);
}

export function isBefore(a: DateLike, b: DateLike): boolean {
  return dayjs(a).isBefore(dayjs(b));
}
