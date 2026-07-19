import Anthropic from "@anthropic-ai/sdk";
import { netSolForWallet } from "@/lib/analytics";
import type { Transaction, WalletStats } from "@/types";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function formatStatsForPrompt(stats: WalletStats): string {
  const topCategories = stats.byCategory
    .slice(0, 8)
    .map((c) => `- ${c.category}: ${c.outflowSol.toFixed(3)} SOL out, ${c.inflowSol.toFixed(3)} SOL in, across ${c.count} tx`)
    .join("\n");

  const topCounterparties = stats.topCounterparties
    .slice(0, 8)
    .map((c) => `- ${c.address}: ${c.outflowSol.toFixed(3)} SOL out, ${c.inflowSol.toFixed(3)} SOL in, across ${c.count} tx`)
    .join("\n");

  const topTokens = stats.tokenTally
    .slice(0, 8)
    .map(
      (t) =>
        `- ${t.symbol ?? t.mint}: ${t.totalSent.toFixed(3)} sent, ${t.totalReceived.toFixed(3)} received, across ${t.count} tx`,
    )
    .join("\n");

  return `Wallet: ${stats.address}${stats.label ? ` (${stats.label})` : ""}
Transactions analyzed: ${stats.txCount}
Total received: ${stats.totalInflowSol.toFixed(4)} SOL
Total sent: ${stats.totalOutflowSol.toFixed(4)} SOL
Net change: ${stats.netSol.toFixed(4)} SOL
Network fees paid: ${stats.totalFeesSol.toFixed(6)} SOL
Date range: ${stats.firstTxAt ? new Date(stats.firstTxAt * 1000).toISOString().slice(0, 10) : "n/a"} to ${stats.lastTxAt ? new Date(stats.lastTxAt * 1000).toISOString().slice(0, 10) : "n/a"}

Spending/receiving broken down by category or protocol source:
${topCategories || "(no categorized activity)"}

Top counterparty addresses (where money came from / went to):
${topCounterparties || "(no counterparty data)"}

Top SPL tokens sent/received (amounts are in each token's own units, not SOL):
${topTokens || "(no token transfers)"}`;
}

export async function generateWalletSynopsis(stats: WalletStats): Promise<string> {
  const prompt = formatStatsForPrompt(stats);

  const response = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system:
      "You are a crypto spending analyst. Given aggregated Solana wallet transaction data, write a concise, plain-English synopsis of where the wallet's money came from and where it went. Call out the biggest spending categories and counterparties by name, note any notable inflow/outflow imbalance, and flag anything that looks like a recurring pattern (e.g. repeated swaps, subscriptions, NFT activity). Do not invent data not present in the input. Keep it under 200 words, no headers, plain prose.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

function formatTransactionsForPrompt(transactions: Transaction[], walletAddress: string): string {
  if (transactions.length === 0) return "(no transactions synced)";

  return transactions
    .map((tx) => {
      const net = netSolForWallet(tx, walletAddress);
      const netStr = `${net > 0 ? "+" : ""}${net.toFixed(4)} SOL`;
      const date = new Date(tx.timestamp * 1000).toISOString().slice(0, 10);
      const desc = tx.description ? tx.description.slice(0, 160) : "(no description)";
      return `- ${date} | ${tx.source !== "UNKNOWN" ? tx.source : tx.type} | net ${netStr} | ${desc} | sig: ${tx.signature}`;
    })
    .join("\n");
}

/**
 * Answers a free-form investigative question about a single wallet, grounded
 * in its aggregated stats plus a sample of its most recent raw transactions
 * (so Claude can reference specific counterparties, signatures, and dates).
 */
export async function answerWalletQuestion(
  question: string,
  stats: WalletStats,
  recentTransactions: Transaction[],
): Promise<string> {
  const prompt = `${formatStatsForPrompt(stats)}

Most recent transactions (up to ${recentTransactions.length}), oldest data has been summarized above — use these for specifics like dates, counterparties, and signatures:
${formatTransactionsForPrompt(recentTransactions, stats.address)}

Question about this wallet: ${question}`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    system:
      "You are a crypto investigative analyst helping someone understand a Solana wallet's activity. Answer the user's question using only the aggregated stats and transaction data provided — do not invent addresses, amounts, or events that aren't in the data. Reference specific counterparties, amounts, categories, or transaction signatures where they support your answer. If the provided data is insufficient to fully answer, say so explicitly and explain what's missing rather than guessing. Keep the answer focused and under 300 words unless the question requires a list.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

export async function generatePortfolioSynopsis(
  perWallet: WalletStats[],
  merged: {
    totalInflowSol: number;
    totalOutflowSol: number;
    netSol: number;
    txCount: number;
    tokenTally?: WalletStats["tokenTally"];
  },
): Promise<string> {
  const walletSummaries = perWallet
    .map(
      (s) =>
        `- ${s.label ?? s.address}: ${s.txCount} tx, ${s.totalOutflowSol.toFixed(3)} SOL out, ${s.totalInflowSol.toFixed(3)} SOL in`,
    )
    .join("\n");

  const topTokens = (merged.tokenTally ?? [])
    .slice(0, 8)
    .map(
      (t) =>
        `- ${t.symbol ?? t.mint}: ${t.totalSent.toFixed(3)} sent, ${t.totalReceived.toFixed(3)} received, across ${t.count} tx`,
    )
    .join("\n");

  const prompt = `Portfolio overview across ${perWallet.length} wallet(s):
Total received: ${merged.totalInflowSol.toFixed(4)} SOL
Total sent: ${merged.totalOutflowSol.toFixed(4)} SOL
Net change: ${merged.netSol.toFixed(4)} SOL
Total transactions: ${merged.txCount}

Per-wallet summary:
${walletSummaries}

Top SPL tokens sent/received across all wallets:
${topTokens || "(no token transfers)"}`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system:
      "You are a crypto spending analyst producing a portfolio-level overview across multiple Solana wallets for one person. Summarize overall spending behavior across all wallets combined: where the bulk of the money went, which wallets are most active, and any cross-wallet patterns. Keep it under 200 words, plain prose, no headers.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}
