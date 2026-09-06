"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CategoryChart from "@/components/CategoryChart";
import StatTile from "@/components/StatTile";
import SynopsisPanel from "@/components/SynopsisPanel";
import TokenActivity from "@/components/TokenActivity";
import type { WalletStats } from "@/types";

interface OverviewResponse {
  walletCount: number;
  perWalletStats: WalletStats[];
  merged: {
    totalInflowSol: number;
    totalOutflowSol: number;
    netSol: number;
    txCount: number;
    byCategory: WalletStats["byCategory"];
    tokenTally: WalletStats["tokenTally"];
  };
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/overview");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function exportWalletsCsv() {
    if (!data) return;

    const header = ["address", "label", "txCount", "totalSentSol", "totalReceivedSol", "netSol"];
    const rows = data.perWalletStats.map((s) => [
      s.address,
      s.label ?? "",
      String(s.txCount),
      s.totalOutflowSol.toFixed(9),
      s.totalInflowSol.toFixed(9),
      s.netSol.toFixed(9),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wallets-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!data || data.walletCount === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Portfolio overview</h1>
        <p className="mt-2 text-sm text-muted">
          No wallets tracked yet. <Link href="/" className="underline">Add one</Link> to see your combined
          spending overview.
        </p>
      </div>
    );
  }

  const { merged, perWalletStats } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Portfolio overview</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Combined activity across {data.walletCount} wallet{data.walletCount === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total transactions" value={merged.txCount.toLocaleString()} />
        <StatTile label="Total received" value={`${merged.totalInflowSol.toFixed(3)} SOL`} tone="good" />
        <StatTile label="Total sent" value={`${merged.totalOutflowSol.toFixed(3)} SOL`} tone="bad" />
        <StatTile
          label="Net"
          value={`${merged.netSol >= 0 ? "+" : ""}${merged.netSol.toFixed(3)} SOL`}
          tone={merged.netSol >= 0 ? "good" : "bad"}
        />
      </div>

      <SynopsisPanel endpoint="/api/overview" title="Portfolio synopsis" />

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Spending by category</h2>
        <CategoryChart items={merged.byCategory} maxItems={10} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Token tally across all wallets</h2>
        <TokenActivity tally={merged.tokenTally} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">By wallet</h2>
          <button
            onClick={exportWalletsCsv}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-text-secondary hover:bg-[var(--gridline)]"
          >
            Export wallets (CSV)
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {perWalletStats
            .slice()
            .sort((a, b) => b.txCount - a.txCount)
            .map((s) => (
              <li key={s.address}>
                <Link
                  href={`/wallet/${s.address}`}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-[var(--gridline)]"
                >
                  <span className="font-mono text-text-secondary">
                    {s.label ?? `${s.address.slice(0, 4)}…${s.address.slice(-4)}`}
                  </span>
                  <span className="tabular-nums text-muted">
                    {s.txCount} tx · {s.totalOutflowSol.toFixed(2)} out · {s.totalInflowSol.toFixed(2)} in
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
