import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats } from "@/lib/analytics";
import { generateWalletSynopsis } from "@/lib/anthropic";
import { annotateTokenMetadata } from "@/lib/tokenMetadata";
import type { Transaction, Wallet } from "@/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const db = await getDb();
  const wallet = await db.collection<Wallet>(COLLECTIONS.wallets).findOne({ address });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const transactions = await db
    .collection<Transaction>(COLLECTIONS.transactions)
    .find({ walletAddress: address }, { projection: { _id: 0 } })
    .toArray();

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "No transaction history synced yet for this wallet." },
      { status: 400 },
    );
  }

  const stats = await annotateTokenMetadata(computeWalletStats(address, transactions, wallet.label));

  try {
    const synopsis = await generateWalletSynopsis(stats);
    return NextResponse.json({ synopsis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error generating synopsis";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
