import type { Transaction } from "@/types";
import { netSolForWallet } from "@/lib/analytics";

interface Props {
  transactions: Transaction[];
  walletAddress: string;
}

export default function TransactionTable({ transactions, walletAddress }: Props) {
  if (transactions.length === 0) {
    return <p className="text-sm text-muted">No transactions synced yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs text-muted">
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Type / Source</th>
            <th className="py-2 pr-3 font-medium">Description</th>
            <th className="py-2 pr-3 text-right font-medium">Net SOL</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const net = netSolForWallet(tx, walletAddress);
            return (
              <tr key={tx.signature} className="border-b border-[var(--gridline)]">
                <td className="py-2 pr-3 text-text-secondary tabular-nums">
                  {new Date(tx.timestamp * 1000).toLocaleDateString()}
                </td>
                <td className="py-2 pr-3 text-text-primary">
                  {tx.source !== "UNKNOWN" ? tx.source : tx.type}
                </td>
                <td className="max-w-xs truncate py-2 pr-3 text-text-secondary" title={tx.description}>
                  {tx.description || "—"}
                </td>
                <td
                  className={`py-2 pr-3 text-right tabular-nums ${
                    net > 0 ? "text-[var(--good)]" : net < 0 ? "text-[var(--series-8)]" : "text-muted"
                  }`}
                >
                  {net > 0 ? "+" : ""}
                  {net.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
