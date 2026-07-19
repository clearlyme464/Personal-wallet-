import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats } from "@/lib/analytics";
import type { Transaction, Wallet } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const db = await getDb();
  const wallet = await db
    .collection<Wallet>(COLLECTIONS.wallets)
    .findOne({ address }, { projection: { _id: 0 } });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const transactions = await db
    .collection<Transaction>(COLLECTIONS.transactions)
    .find({ walletAddress: address }, { projection: { _id: 0 } })
    .sort({ timestamp: -1 })
    .toArray();

  const stats = computeWalletStats(address, transactions, wallet.label);

  return NextResponse.json({ wallet, stats, transactions: transactions.slice(0, 100) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const db = await getDb();
  await db.collection(COLLECTIONS.wallets).deleteOne({ address });
  await db.collection(COLLECTIONS.transactions).deleteMany({ walletAddress: address });
  return NextResponse.json({ ok: true });
}
