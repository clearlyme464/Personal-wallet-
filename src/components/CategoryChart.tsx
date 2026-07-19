import type { CategoryBreakdownItem } from "@/types";

interface Props {
  items: CategoryBreakdownItem[];
  maxItems?: number;
}

export default function CategoryChart({ items, maxItems = 8 }: Props) {
  const rows = items.slice(0, maxItems);
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No categorized activity yet.</p>;
  }

  const max = Math.max(...rows.map((r) => Math.max(r.outflowSol, r.inflowSol)), 0.0001);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-1)" }} />
          Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-2)" }} />
          Received
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.category}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-text-primary">{row.category}</span>
              <span className="text-xs text-muted">{row.count} tx</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div
                className="h-2 rounded-full bg-[var(--gridline)]"
                title={`${row.outflowSol.toFixed(4)} SOL sent via ${row.category}`}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(row.outflowSol / max) * 100}%`,
                    background: "var(--series-1)",
                  }}
                />
              </div>
              <div
                className="h-2 rounded-full bg-[var(--gridline)]"
                title={`${row.inflowSol.toFixed(4)} SOL received via ${row.category}`}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(row.inflowSol / max) * 100}%`,
                    background: "var(--series-2)",
                  }}
                />
              </div>
            </div>
            <div className="mt-0.5 flex justify-between text-xs text-muted">
              <span>{row.outflowSol.toFixed(3)} SOL out</span>
              <span>{row.inflowSol.toFixed(3)} SOL in</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
