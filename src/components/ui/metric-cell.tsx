type MetricCellProps = {
  label: string;
  value: string;
  note: string;
  tone?: "income" | "expense" | "transfer" | "adjustment";
};

export function MetricCell({ label, value, note, tone }: MetricCellProps) {
  return (
    <article className="metric">
      <p className="metric-label">{label}</p>
      <p className={`metric-value ${tone ?? ""}`}>{value}</p>
      <p className="metric-note">{note}</p>
    </article>
  );
}
