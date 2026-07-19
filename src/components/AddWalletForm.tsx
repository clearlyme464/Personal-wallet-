"use client";

import { useState } from "react";

interface Props {
  onAdded: () => void;
}

interface WalletResult {
  address: string;
  status: string;
  error?: string;
  answer?: string;
}

export default function AddWalletForm({ onAdded }: Props) {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WalletResult[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setAnswers([]);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, question: question.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add wallet(s)");

      const results: WalletResult[] = data.results;
      const added = results.filter((r) => r.status !== "already_added").length;
      const skipped = results.length - added;
      setNotice(
        `${added} wallet${added === 1 ? "" : "s"} added${skipped ? `, ${skipped} already tracked` : ""}.`,
      );
      setAnswers(results.filter((r) => r.answer));
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

      <label htmlFor="wallet-question" className="mb-2 mt-3 block text-sm font-medium text-text-primary">
        Ask Claude something about these wallets <span className="font-normal text-muted">(optional)</span>
      </label>
      <input
        id="wallet-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Does this wallet show signs of being a scam or mixer?"
        className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]"
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

      {answers.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--gridline)] pt-3">
          {answers.map((r) => (
            <div key={r.address}>
              <p className="font-mono text-xs text-muted">
                {r.address.slice(0, 4)}…{r.address.slice(-4)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{r.answer}</p>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
