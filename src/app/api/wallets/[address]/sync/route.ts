import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { DEFAULT_MAX_TRANSACTIONS, fetchWalletTransactions } from "@/lib/helius";
import type { Transaction, Wallet } from "@/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const db = await getDb();
  const walletsCol = db.collection<Wallet>(COLLECTIONS.wallets);
  const txCol = db.collection<Transaction>(COLLECTIONS.transactions);

  const wallet = await walletsCol.findOne({ address });
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  await walletsCol.updateOne({ address }, { $set: { syncStatus: "syncing" } });

  try {
    const transactions = await fetchWalletTransactions(address, DEFAULT_MAX_TRANSACTIONS);
    if (transactions.length > 0) {
      const ops = transactions.map((tx) => ({
        updateOne: {
          filter: { walletAddress: tx.walletAddress, signature: tx.signature },
          update: { $set: tx },
          upsert: true,
        },
      }));
      await txCol.bulkWrite(ops);
    }
    await walletsCol.updateOne(
      { address },
      { $set: { syncStatus: "idle", lastSyncedAt: new Date().toISOString() }, $unset: { syncError: "" } },
    );
    return NextResponse.json({ ok: true, fetched: transactions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await walletsCol.updateOne({ address }, { $set: { syncStatus: "error", syncError: message } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
