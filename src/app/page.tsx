"use client";

import { useCallback, useEffect, useState } from "react";
import AddWalletForm from "@/components/AddWalletForm";
import AskClaudePanel from "@/components/AskClaudePanel";
import WalletCard from "@/components/WalletCard";
import type { Wallet } from "@/types";

export default function HomePage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/wallets");
    const data = await res.json();
    setWallets(data.wallets ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Your wallets</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Paste a Solana wallet address to import its transaction history and see where the money went.
        </p>
      </div>

      <AddWalletForm onAdded={refresh} />

      {!loading && wallets.length > 0 && (
        <AskClaudePanel
          endpoint="/api/overview/ask"
          title="Ask Claude about your added wallets"
          placeholder="e.g. Which of my wallets sent BAWLS, and to how many addresses?"
        />
      )}

      <div>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : wallets.length === 0 ? (
          <p className="text-sm text-muted">No wallets tracked yet — add one above to get started.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {wallets.map((w) => (
              <WalletCard key={w.address} wallet={w} onRemoved={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
