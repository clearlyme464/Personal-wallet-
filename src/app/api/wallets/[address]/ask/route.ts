import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { computeWalletStats } from "@/lib/analytics";
import { answerWalletQuestion } from "@/lib/anthropic";
import type { Investigation, Transaction, Wallet } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const body = await request.json().catch(() => ({}));
  const question: string = (body.question ?? "").trim();

  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "Question is too long (max 1000 characters)." }, { status: 400 });
  }

  const db = await getDb();
  const walletsCol = db.collection<Wallet>(COLLECTIONS.wallets);
  const wallet = await walletsCol.findOne({ address });
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const transactions = await db
    .collection<Transaction>(COLLECTIONS.transactions)
    .find({ walletAddress: address }, { projection: { _id: 0 } })
    .sort({ timestamp: -1 })
    .toArray();

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "No transaction history synced yet for this wallet." },
      { status: 400 },
    );
  }

  const stats = computeWalletStats(address, transactions, wallet.label);

  try {
    const answer = await answerWalletQuestion(question, stats, transactions.slice(0, 60));

    const investigation: Investigation = { question, answer, answeredAt: new Date().toISOString() };
    await walletsCol.updateOne({ address }, { $push: { investigations: investigation } });

    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error answering question";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
