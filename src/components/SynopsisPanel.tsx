"use client";

import { useState } from "react";

interface Props {
  endpoint: string;
  title?: string;
}

export default function SynopsisPanel({ endpoint, title = "Spending synopsis" }: Props) {
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate synopsis");
      setSynopsis(data.synopsis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate synopsis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-[var(--series-1)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : synopsis ? "Regenerate" : "Generate with Claude"}
        </button>
      </div>
      {error && <p className="text-sm text-[var(--series-8)]">{error}</p>}
      {synopsis && <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{synopsis}</p>}
      {!synopsis && !error && !loading && (
        <p className="text-sm text-muted">Click to have Claude summarize the spending activity in plain English.</p>
      )}
    </div>
  );
}
