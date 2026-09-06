import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats, mergeWalletStats } from "@/lib/analytics";
import { answerPortfolioQuestion } from "@/lib/anthropic";
import { annotateTokenMetadata } from "@/lib/tokenMetadata";
import type { Transaction, Wallet, WalletStats } from "@/types";

const RECENT_TX_PER_WALLET = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const question: string = (body.question ?? "").trim();

  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "Question is too long (max 1000 characters)." }, { status: 400 });
  }

  const db = await getDb();
  const wallets = await db.collection<Wallet>(COLLECTIONS.wallets).find({}).toArray();

  if (wallets.length === 0) {
    return NextResponse.json({ error: "No wallets added yet." }, { status: 400 });
  }

  const perWalletStats: WalletStats[] = [];
  const recentTransactionsByAddress = new Map<string, Transaction[]>();

  for (const wallet of wallets) {
    const transactions = await db
      .collection<Transaction>(COLLECTIONS.transactions)
      .find({ walletAddress: wallet.address }, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .toArray();

    const stats = await annotateTokenMetadata(computeWalletStats(wallet.address, transactions, wallet.label));
    perWalletStats.push(stats);
    recentTransactionsByAddress.set(wallet.address, transactions.slice(0, RECENT_TX_PER_WALLET));
  }

  const merged = mergeWalletStats(perWalletStats);

  try {
    const answer = await answerPortfolioQuestion(question, perWalletStats, merged, recentTransactionsByAddress);
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error answering question";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
