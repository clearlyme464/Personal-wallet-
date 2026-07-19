import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { parseWalletInput } from "@/lib/solana";
import { fetchWalletTransactions } from "@/lib/helius";
import type { Transaction, Wallet } from "@/types";

export async function GET() {
  const db = await getDb();
  const wallets = await db
    .collection<Wallet>(COLLECTIONS.wallets)
    .find({}, { projection: { _id: 0 } })
    .sort({ addedAt: -1 })
    .toArray();

  return NextResponse.json({ wallets });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input: string = body.input ?? "";
  const addresses = parseWalletInput(input);

  if (addresses.length === 0) {
    return NextResponse.json(
      { error: "No valid Solana wallet addresses found in input." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const walletsCol = db.collection<Wallet>(COLLECTIONS.wallets);
  const txCol = db.collection<Transaction>(COLLECTIONS.transactions);

  const results: { address: string; status: string; error?: string }[] = [];

  for (const address of addresses) {
    const existing = await walletsCol.findOne({ address });
    if (existing) {
      results.push({ address, status: "already_added" });
      continue;
    }

    const now = new Date().toISOString();
    await walletsCol.insertOne({ address, addedAt: now, syncStatus: "syncing" });

    try {
      const transactions = await fetchWalletTransactions(address, 200);
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
      results.push({ address, status: "added" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await walletsCol.updateOne(
        { address },
        { $set: { syncStatus: "error", syncError: message } },
      );
      results.push({ address, status: "added_with_sync_error", error: message });
    }
  }

  return NextResponse.json({ results });
}
