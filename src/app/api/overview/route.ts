import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats, mergeWalletStats } from "@/lib/analytics";
import { generatePortfolioSynopsis } from "@/lib/anthropic";
import { annotateTokenMetadata } from "@/lib/tokenMetadata";
import type { Transaction, Wallet, WalletStats } from "@/types";

async function loadPerWalletStats(): Promise<WalletStats[]> {
  const db = await getDb();
  const wallets = await db.collection<Wallet>(COLLECTIONS.wallets).find({}).toArray();

  const perWalletStats: WalletStats[] = [];
  for (const wallet of wallets) {
    const transactions = await db
      .collection<Transaction>(COLLECTIONS.transactions)
      .find({ walletAddress: wallet.address }, { projection: { _id: 0 } })
      .toArray();
    const stats = await annotateTokenMetadata(computeWalletStats(wallet.address, transactions, wallet.label));
    perWalletStats.push(stats);
  }

  return perWalletStats;
}

export async function GET() {
  const db = await getDb();
  const walletCount = await db.collection<Wallet>(COLLECTIONS.wallets).countDocuments();
  const perWalletStats = await loadPerWalletStats();
  const merged = mergeWalletStats(perWalletStats);

  return NextResponse.json({ walletCount, perWalletStats, merged });
}

export async function POST() {
  const perWalletStats = await loadPerWalletStats();

  if (perWalletStats.length === 0) {
    return NextResponse.json({ error: "No wallets added yet." }, { status: 400 });
  }

  const merged = mergeWalletStats(perWalletStats);

  try {
    const synopsis = await generatePortfolioSynopsis(perWalletStats, merged);
    return NextResponse.json({ synopsis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error generating synopsis";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
