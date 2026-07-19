"use client";

import { useState } from "react";

interface Props {
  endpoint: string;
  title?: string;
  placeholder?: string;
  initialQaPairs?: { question: string; answer: string }[];
}

export default function AskClaudePanel({
  endpoint,
  title = "Ask Claude about this wallet",
  placeholder = "e.g. Does this wallet look like it's interacting with any known scam or mixer addresses?",
  initialQaPairs = [],
}: Props) {
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
      const res = await fetch(endpoint, {
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
    <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
      <form onSubmit={handleAsk} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length === 0}
          className="shrink-0 rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-[var(--series-8)]">{error}</p>}

      {qaPairs.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {qaPairs
            .slice()
            .reverse()
            .map((qa, i) => (
              <div key={i} className="border-t border-[var(--gridline)] pt-3 first:border-t-0 first:pt-0">
                <p className="text-xs font-medium text-text-secondary">Q: {qa.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{qa.answer}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
