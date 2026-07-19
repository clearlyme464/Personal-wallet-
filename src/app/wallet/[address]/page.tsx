"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AskClaudePanel from "@/components/AskClaudePanel";
import CategoryChart from "@/components/CategoryChart";
import StatTile from "@/components/StatTile";
import SynopsisPanel from "@/components/SynopsisPanel";
import TokenActivity from "@/components/TokenActivity";
import TransactionTable from "@/components/TransactionTable";
import type { Transaction, Wallet, WalletStats } from "@/types";

export default function WalletDetailPage() {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const address = params.address;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/wallets/${address}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setWallet(data.wallet);
    setStats(data.stats);
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleResync() {
    setSyncing(true);
    await fetch(`/api/wallets/${address}/sync`, { method: "POST" });
    await refresh();
    setSyncing(false);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (notFound) return <p className="text-sm text-muted">Wallet not found.</p>;
  if (!wallet || !stats) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push("/")} className="text-xs text-muted hover:text-text-primary">
            ← All wallets
          </button>
          <h1 className="mt-1 break-all font-mono text-lg font-semibold text-text-primary">{address}</h1>
        </div>
        <button
          onClick={handleResync}
          disabled={syncing}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-text-primary disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Re-sync"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Transactions" value={stats.txCount.toLocaleString()} />
        <StatTile label="Received" value={`${stats.totalInflowSol.toFixed(3)} SOL`} tone="good" />
        <StatTile label="Sent" value={`${stats.totalOutflowSol.toFixed(3)} SOL`} tone="bad" />
        <StatTile
          label="Net"
          value={`${stats.netSol >= 0 ? "+" : ""}${stats.netSol.toFixed(3)} SOL`}
          tone={stats.netSol >= 0 ? "good" : "bad"}
        />
      </div>

      <SynopsisPanel endpoint={`/api/wallets/${address}/synopsis`} />

      <AskClaudePanel
        endpoint={`/api/wallets/${address}/ask`}
        initialQaPairs={(wallet.investigations ?? []).map((i) => ({ question: i.question, answer: i.answer }))}
      />

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Where the money went</h2>
        <CategoryChart items={stats.byCategory} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Token activity</h2>
        <TokenActivity tally={stats.tokenTally} flows={stats.tokenFlows} />
      </div>

      {stats.topCounterparties.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Top counterparties</h2>
          <ul className="flex flex-col gap-2">
            {stats.topCounterparties.map((c) => (
              <li key={c.address} className="flex items-center justify-between text-sm">
                <span className="truncate font-mono text-text-secondary">{c.address}</span>
                <span className="ml-3 shrink-0 tabular-nums text-muted">
                  {c.outflowSol > 0 && `${c.outflowSol.toFixed(3)} out`}
                  {c.outflowSol > 0 && c.inflowSol > 0 && " · "}
                  {c.inflowSol > 0 && `${c.inflowSol.toFixed(3)} in`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent transactions</h2>
        <TransactionTable transactions={transactions} walletAddress={address} />
      </div>
    </div>
  );
}
