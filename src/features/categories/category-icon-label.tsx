import type { LucideIcon } from "lucide-react";
import {
  CarIcon,
  CoffeeIcon,
  Gamepad2Icon,
  GiftIcon,
  HeartPulseIcon,
  HomeIcon,
  PackageIcon,
  PartyPopperIcon,
  PiggyBankIcon,
  PlaneIcon,
  RadioTowerIcon,
  ReceiptTextIcon,
  RepeatIcon,
  ShirtIcon,
  ShoppingBasketIcon,
  SmartphoneIcon,
  SparklesIcon,
  TrendingUpIcon,
  Undo2Icon,
  UtensilsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeCategoryIconKey, type CategoryIconKey } from "./icon-utils";

type CategoryIconProps = {
  iconKey?: string | null;
  className?: string;
  iconClassName?: string;
};

type CategoryIconLabelProps = CategoryIconProps & {
  name: string;
  iconContainerClassName?: string;
  labelClassName?: string;
};

const iconByKey: Record<CategoryIconKey, LucideIcon> = {
  housing: HomeIcon,
  communication: RadioTowerIcon,
  grocery: ShoppingBasketIcon,
  dining: UtensilsIcon,
  coffee: CoffeeIcon,
  "daily-goods": PackageIcon,
  beauty: SparklesIcon,
  electronics: SmartphoneIcon,
  clothing: ShirtIcon,
  transport: CarIcon,
  game: Gamepad2Icon,
  subscription: RepeatIcon,
  medical: HeartPulseIcon,
  entertainment: PartyPopperIcon,
  travel: PlaneIcon,
  gift: GiftIcon,
  "fees-tax": ReceiptTextIcon,
  income: TrendingUpIcon,
  refund: Undo2Icon,
  other: PiggyBankIcon,
};

const badgeByKey: Record<CategoryIconKey, string> = {
  housing: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
  communication: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-200",
  grocery: "bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-200",
  dining: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
  coffee: "bg-stone-100 text-stone-700 dark:bg-stone-800/70 dark:text-stone-200",
  "daily-goods": "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  beauty: "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-200",
  electronics: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200",
  clothing: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200",
  transport: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
  game: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-200",
  subscription: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200",
  medical: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  entertainment: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  travel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  gift: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200",
  "fees-tax": "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  income: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200",
  refund: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200",
  other: "bg-muted text-muted-foreground",
};

export function CategoryIcon({ iconKey, className, iconClassName }: CategoryIconProps) {
  const normalizedIconKey = normalizeCategoryIconKey(iconKey);
  const Icon = iconByKey[normalizedIconKey];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
        badgeByKey[normalizedIconKey],
        className,
      )}
    >
      <Icon className={cn("size-4", iconClassName)} />
    </span>
  );
}

export function CategoryIconLabel({
  iconKey,
  name,
  className,
  iconContainerClassName,
  iconClassName,
  labelClassName,
}: CategoryIconLabelProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <CategoryIcon
        iconKey={iconKey}
        className={cn("size-7 rounded-md", iconContainerClassName)}
        iconClassName={iconClassName}
      />
      <span className={cn("truncate", labelClassName)}>{name}</span>
    </span>
  );
}
