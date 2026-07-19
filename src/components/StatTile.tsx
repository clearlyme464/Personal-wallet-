interface Props {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}

export default function StatTile({ label, value, tone = "neutral" }: Props) {
  const color =
    tone === "good" ? "text-[var(--good)]" : tone === "bad" ? "text-[var(--series-8)]" : "text-text-primary";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
