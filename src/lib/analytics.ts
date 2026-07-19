import { lamportsToSol } from "@/lib/solana";
import type {
  CategoryBreakdownItem,
  CounterpartyBreakdownItem,
  Transaction,
  WalletStats,
} from "@/types";

interface Bucket {
  outflow: number; // lamports
  inflow: number; // lamports
  count: number;
}

function bump(map: Map<string, Bucket>, key: string, outflow: number, inflow: number) {
  const existing = map.get(key) ?? { outflow: 0, inflow: 0, count: 0 };
  existing.outflow += outflow;
  existing.inflow += inflow;
  existing.count += 1;
  map.set(key, existing);
}

export function computeWalletStats(
  address: string,
  transactions: Transaction[],
  label?: string,
): WalletStats {
  let totalInflow = 0;
  let totalOutflow = 0;
  let totalFees = 0;
  let firstTxAt: number | null = null;
  let lastTxAt: number | null = null;

  const categoryMap = new Map<string, Bucket>();
  const counterpartyMap = new Map<string, Bucket>();

  for (const tx of transactions) {
    if (firstTxAt === null || tx.timestamp < firstTxAt) firstTxAt = tx.timestamp;
    if (lastTxAt === null || tx.timestamp > lastTxAt) lastTxAt = tx.timestamp;
    if (tx.feePayer === address) totalFees += tx.fee;

    let txOutflow = 0;
    let txInflow = 0;

    for (const nt of tx.nativeTransfers) {
      if (nt.fromUserAccount === address && nt.toUserAccount !== address) {
        txOutflow += nt.amount;
        if (nt.toUserAccount) bump(counterpartyMap, nt.toUserAccount, nt.amount, 0);
      }
      if (nt.toUserAccount === address && nt.fromUserAccount !== address) {
        txInflow += nt.amount;
        if (nt.fromUserAccount) bump(counterpartyMap, nt.fromUserAccount, 0, nt.amount);
      }
    }

    if (txOutflow === 0 && txInflow === 0) continue;

    totalOutflow += txOutflow;
    totalInflow += txInflow;

    const category = tx.source && tx.source !== "UNKNOWN" ? tx.source : tx.type || "UNKNOWN";
    bump(categoryMap, category, txOutflow, txInflow);
  }

  const byCategory: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, b]) => ({
      category,
      outflowSol: lamportsToSol(b.outflow),
      inflowSol: lamportsToSol(b.inflow),
      count: b.count,
    }))
    .sort((a, b) => b.outflowSol + b.inflowSol - (a.outflowSol + a.inflowSol));

  const topCounterparties: CounterpartyBreakdownItem[] = Array.from(counterpartyMap.entries())
    .map(([addr, b]) => ({
      address: addr,
      outflowSol: lamportsToSol(b.outflow),
      inflowSol: lamportsToSol(b.inflow),
      count: b.count,
    }))
    .sort((a, b) => b.outflowSol + b.inflowSol - (a.outflowSol + a.inflowSol))
    .slice(0, 10);

  return {
    address,
    label,
    txCount: transactions.length,
    totalInflowSol: lamportsToSol(totalInflow),
    totalOutflowSol: lamportsToSol(totalOutflow),
    netSol: lamportsToSol(totalInflow - totalOutflow),
    totalFeesSol: lamportsToSol(totalFees),
    firstTxAt,
    lastTxAt,
    byCategory,
    topCounterparties,
  };
}

export function mergeWalletStats(stats: WalletStats[]): {
  totalInflowSol: number;
  totalOutflowSol: number;
  netSol: number;
  txCount: number;
  byCategory: CategoryBreakdownItem[];
} {
  const categoryMap = new Map<string, Bucket>();
  let totalInflowSol = 0;
  let totalOutflowSol = 0;
  let txCount = 0;

  for (const s of stats) {
    totalInflowSol += s.totalInflowSol;
    totalOutflowSol += s.totalOutflowSol;
    txCount += s.txCount;
    for (const c of s.byCategory) {
      const existing = categoryMap.get(c.category) ?? { outflow: 0, inflow: 0, count: 0 };
      existing.outflow += c.outflowSol;
      existing.inflow += c.inflowSol;
      existing.count += c.count;
      categoryMap.set(c.category, existing);
    }
  }

  const byCategory: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, b]) => ({
      category,
      outflowSol: b.outflow,
      inflowSol: b.inflow,
      count: b.count,
    }))
    .sort((a, b) => b.outflowSol + b.inflowSol - (a.outflowSol + a.inflowSol));

  return {
    totalInflowSol,
    totalOutflowSol,
    netSol: totalInflowSol - totalOutflowSol,
    txCount,
    byCategory,
  };
}
