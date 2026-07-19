"use client";

import { useState } from "react";

interface Props {
  onAdded: () => void;
}

export default function AddWalletForm({ onAdded }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add wallet(s)");

      const added = data.results.filter((r: { status: string }) => r.status !== "already_added").length;
      const skipped = data.results.length - added;
      setNotice(
        `${added} wallet${added === 1 ? "" : "s"} added${skipped ? `, ${skipped} already tracked` : ""}.`,
      );
      setInput("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add wallet(s)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] bg-surface p-4">
      <label htmlFor="wallet-input" className="mb-2 block text-sm font-medium text-text-primary">
        Paste one or more Solana wallet addresses
      </label>
      <textarea
        id="wallet-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={"e.g.\n7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"}
        rows={3}
        className="w-full resize-y rounded-md border border-[var(--border)] bg-transparent p-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add wallet(s)"}
        </button>
        {notice && <span className="text-sm text-[var(--good)]">{notice}</span>}
        {error && <span className="text-sm text-[var(--series-8)]">{error}</span>}
      </div>
    </form>
  );
}
