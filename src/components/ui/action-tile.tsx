"use client";

type ActionTileProps = {
  title: string;
  meta: string;
  amountHint: string;
  badge: string;
  theme?: "bank" | "card" | "wallet" | "cash" | "income" | "transfer" | "temporary";
  onClick: () => void;
};

export function ActionTile({
  title,
  meta,
  amountHint,
  badge,
  theme = "wallet",
  onClick,
}: ActionTileProps) {
  return (
    <button className={`action-tile theme-${theme}`} type="button" onClick={onClick}>
      <span className="action-tile-badge" aria-hidden="true">
        {badge}
      </span>
      <span className="action-tile-title">{title}</span>
      <span className="action-tile-meta">{meta}</span>
      <span className="action-tile-amount">{amountHint}</span>
    </button>
  );
}
