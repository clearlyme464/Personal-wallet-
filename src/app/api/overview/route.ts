import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats, mergeWalletStats } from "@/lib/analytics";
import { generatePortfolioSynopsis } from "@/lib/anthropic";
import type { Transaction, Wallet } from "@/types";

export async function GET() {
  const db = await getDb();
  const wallets = await db.collection<Wallet>(COLLECTIONS.wallets).find({}).toArray();

  const perWalletStats = [];
  for (const wallet of wallets) {
    const transactions = await db
      .collection<Transaction>(COLLECTIONS.transactions)
      .find({ walletAddress: wallet.address }, { projection: { _id: 0 } })
      .toArray();
    perWalletStats.push(computeWalletStats(wallet.address, transactions, wallet.label));
  }

  const merged = mergeWalletStats(perWalletStats);

  return NextResponse.json({ walletCount: wallets.length, perWalletStats, merged });
}

export async function POST() {
  const db = await getDb();
  const wallets = await db.collection<Wallet>(COLLECTIONS.wallets).find({}).toArray();

  if (wallets.length === 0) {
    return NextResponse.json({ error: "No wallets added yet." }, { status: 400 });
  }

  const perWalletStats = [];
  for (const wallet of wallets) {
    const transactions = await db
      .collection<Transaction>(COLLECTIONS.transactions)
      .find({ walletAddress: wallet.address }, { projection: { _id: 0 } })
      .toArray();
    perWalletStats.push(computeWalletStats(wallet.address, transactions, wallet.label));
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
