"use client";

import { useState } from "react";

interface QaPair {
  question: string;
  answer: string;
}

interface Props {
  address: string;
  initialQaPairs?: QaPair[];
}

export default function InlineAskForm({ address, initialQaPairs = [] }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaPairs, setQaPairs] = useState(initialQaPairs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallets/${address}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get an answer");
      setQaPairs((prev) => [...prev, { question: trimmed, answer: data.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--gridline)] pt-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs font-medium text-[var(--series-1)] hover:underline"
      >
        {expanded
          ? "Hide questions"
          : qaPairs.length > 0
            ? `Ask Claude (${qaPairs.length} asked)`
            : "Ask Claude a question"}
      </button>

      {expanded && (
        <div className="mt-2">
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Does this wallet look suspicious?"
              className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]"
            />
            <button
              type="submit"
              disabled={loading || question.trim().length === 0}
              className="shrink-0 rounded-md bg-[var(--series-1)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {loading ? "Asking…" : "Ask"}
            </button>
          </form>
          {error && <p className="mt-1 text-xs text-[var(--series-8)]">{error}</p>}
          {qaPairs.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {qaPairs
                .slice()
                .reverse()
                .map((qa, i) => (
                  <div key={i} className="border-t border-[var(--gridline)] pt-2 first:border-t-0 first:pt-0">
                    <p className="text-xs font-medium text-text-secondary">Q: {qa.question}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-text-primary">
                      {qa.answer}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
