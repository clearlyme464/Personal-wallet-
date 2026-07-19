import type { TokenFlowItem, TokenTally } from "@/types";

interface Props {
  tally: TokenTally[];
  flows?: TokenFlowItem[];
  maxTallyRows?: number;
  maxFlowRows?: number;
}

function tokenLabel(mint: string, symbol?: string): string {
  return symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function TokenActivity({ tally, flows = [], maxTallyRows = 15, maxFlowRows = 40 }: Props) {
  if (tally.length === 0) {
    return <p className="text-sm text-muted">No SPL token transfers found yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gridline)] text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Token</th>
              <th className="py-2 pr-3 text-right font-medium">Sent</th>
              <th className="py-2 pr-3 text-right font-medium">Received</th>
              <th className="py-2 pr-3 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {tally.slice(0, maxTallyRows).map((t) => (
              <tr key={t.mint} className="border-b border-[var(--gridline)]">
                <td className="py-2 pr-3 font-medium text-text-primary" title={t.name ?? t.mint}>
                  {tokenLabel(t.mint, t.symbol)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--series-1)]">
                  {t.totalSent > 0 ? formatAmount(t.totalSent) : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--good)]">
                  {t.totalReceived > 0 ? formatAmount(t.totalReceived) : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted">{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {flows.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Sent &amp; received by address
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gridline)] text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Token</th>
                  <th className="py-2 pr-3 font-medium">Direction</th>
                  <th className="py-2 pr-3 font-medium">Address</th>
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  <th className="py-2 pr-3 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {flows.slice(0, maxFlowRows).map((f) => (
                  <tr
                    key={`${f.mint}-${f.counterparty}-${f.direction}`}
                    className="border-b border-[var(--gridline)]"
                  >
                    <td className="py-2 pr-3 text-text-primary" title={f.name ?? f.mint}>
                      {tokenLabel(f.mint, f.symbol)}
                    </td>
                    <td
                      className={`py-2 pr-3 ${
                        f.direction === "sent" ? "text-[var(--series-1)]" : "text-[var(--good)]"
                      }`}
                    >
                      {f.direction === "sent" ? "Sent" : "Received"}
                    </td>
                    <td className="max-w-[16rem] truncate py-2 pr-3 font-mono text-text-secondary" title={f.counterparty}>
                      {f.counterparty}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-text-primary">
                      {formatAmount(f.amount)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted">{f.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
