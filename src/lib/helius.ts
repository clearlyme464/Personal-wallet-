import type { NativeTransfer, TokenTransfer, Transaction } from "@/types";

const HELIUS_BASE_URL = "https://api.helius.xyz";

interface RawHeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  description?: string;
  fee: number;
  feePayer?: string;
  nativeTransfers?: NativeTransfer[];
  tokenTransfers?: TokenTransfer[];
}

export function apiKey(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY is not set");
  return key;
}

/** Default depth of transaction history synced per wallet. Bump this (and any
 *  explicit call-site overrides) if a wallet's older activity — e.g. a token
 *  transfer further back than this many transactions — isn't showing up. */
export const DEFAULT_MAX_TRANSACTIONS = 2000;

/**
 * Fetches parsed transaction history for a wallet via Helius's Enhanced
 * Transactions API. Paginates backwards from the most recent signature
 * using the `before` cursor until `maxTransactions` is reached or the
 * wallet's history is exhausted.
 */
export async function fetchWalletTransactions(
  address: string,
  maxTransactions = DEFAULT_MAX_TRANSACTIONS,
): Promise<Transaction[]> {
  const results: Transaction[] = [];
  let before: string | undefined;

  while (results.length < maxTransactions) {
    const url = new URL(`${HELIUS_BASE_URL}/v0/addresses/${address}/transactions`);
    url.searchParams.set("api-key", apiKey());
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Helius request failed (${res.status}): ${body}`);
    }

    const batch = (await res.json()) as RawHeliusTransaction[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const tx of batch) {
      results.push({
        walletAddress: address,
        signature: tx.signature,
        timestamp: tx.timestamp,
        type: tx.type || "UNKNOWN",
        source: tx.source || "UNKNOWN",
        description: tx.description,
        fee: tx.fee ?? 0,
        feePayer: tx.feePayer,
        nativeTransfers: tx.nativeTransfers ?? [],
        tokenTransfers: tx.tokenTransfers ?? [],
      });
    }

    if (batch.length < 100) break;
    before = batch[batch.length - 1].signature;
  }

  return results.slice(0, maxTransactions);
}
