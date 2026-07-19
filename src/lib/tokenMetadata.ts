import type { WalletStats } from "@/types";

const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

interface TokenMeta {
  symbol: string;
  name: string;
}

interface JupiterTokenListEntry {
  address: string;
  symbol: string;
  name: string;
}

let tokenListCache: Map<string, TokenMeta> | null = null;
let tokenListPromise: Promise<Map<string, TokenMeta>> | null = null;

async function loadTokenList(): Promise<Map<string, TokenMeta>> {
  if (tokenListCache) return tokenListCache;
  if (tokenListPromise) return tokenListPromise;

  tokenListPromise = (async () => {
    try {
      const res = await fetch("https://token.jup.ag/strict", { cache: "no-store" });
      if (!res.ok) throw new Error(`Token list request failed (${res.status})`);
      const list = (await res.json()) as JupiterTokenListEntry[];
      const map = new Map<string, TokenMeta>();
      for (const entry of list) {
        map.set(entry.address, { symbol: entry.symbol, name: entry.name });
      }
      tokenListCache = map;
      return map;
    } catch {
      // Metadata is a nice-to-have; degrade to showing raw mint addresses.
      tokenListCache = new Map();
      return tokenListCache;
    }
  })();

  return tokenListPromise;
}

/** Resolves a set of SPL mint addresses to their symbol/name, where known. */
export async function resolveTokenMetadata(mints: string[]): Promise<Map<string, TokenMeta>> {
  const result = new Map<string, TokenMeta>();
  const unresolved: string[] = [];

  for (const mint of mints) {
    if (mint === WRAPPED_SOL_MINT) {
      result.set(mint, { symbol: "SOL", name: "Wrapped SOL" });
    } else {
      unresolved.push(mint);
    }
  }

  if (unresolved.length === 0) return result;

  const list = await loadTokenList();
  for (const mint of unresolved) {
    const meta = list.get(mint);
    if (meta) result.set(mint, meta);
  }

  return result;
}

/** Attaches resolved symbol/name to a wallet's token tally and flow breakdowns. */
export async function annotateTokenMetadata(stats: WalletStats): Promise<WalletStats> {
  const mints = new Set<string>();
  for (const t of stats.tokenTally) mints.add(t.mint);
  for (const f of stats.tokenFlows) mints.add(f.mint);
  if (mints.size === 0) return stats;

  const meta = await resolveTokenMetadata(Array.from(mints));

  return {
    ...stats,
    tokenTally: stats.tokenTally.map((t) => ({ ...t, ...meta.get(t.mint) })),
    tokenFlows: stats.tokenFlows.map((f) => ({ ...f, ...meta.get(f.mint) })),
  };
}
