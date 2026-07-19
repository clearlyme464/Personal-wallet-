"use client";

import Link from "next/link";
import InlineAskForm from "@/components/InlineAskForm";
import type { Wallet } from "@/types";

interface Props {
  wallet: Wallet;
  onRemoved: () => void;
}

function abbreviate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function WalletCard({ wallet, onRemoved }: Props) {
  async function handleRemove() {
    if (!confirm(`Remove ${abbreviate(wallet.address)} and its synced transactions?`)) return;
    await fetch(`/api/wallets/${wallet.address}`, { method: "DELETE" });
    onRemoved();
  }

  const statusColor =
    wallet.syncStatus === "error"
      ? "text-[var(--series-8)]"
      : wallet.syncStatus === "syncing"
        ? "text-[var(--series-4)]"
        : "text-[var(--good)]";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-4 transition hover:border-[var(--series-1)]">
      <div className="flex items-center justify-between">
        <Link href={`/wallet/${wallet.address}`} className="flex-1">
          <div className="font-mono text-sm font-medium text-text-primary">
            {wallet.label ?? abbreviate(wallet.address)}
          </div>
          {wallet.label && <div className="font-mono text-xs text-muted">{abbreviate(wallet.address)}</div>}
          <div className={`mt-1 text-xs ${statusColor}`}>
            {wallet.syncStatus === "syncing"
              ? "Syncing…"
              : wallet.syncStatus === "error"
                ? `Sync error: ${wallet.syncError ?? "unknown"}`
                : wallet.lastSyncedAt
                  ? `Synced ${new Date(wallet.lastSyncedAt).toLocaleString()}`
                  : "Not synced yet"}
          </div>
        </Link>
        <button
          onClick={handleRemove}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:bg-[var(--gridline)] hover:text-[var(--series-8)]"
        >
          Remove
        </button>
      </div>

      <InlineAskForm
        address={wallet.address}
        initialQaPairs={(wallet.investigations ?? []).map((i) => ({ question: i.question, answer: i.answer }))}
      />
    </div>
  );
}
