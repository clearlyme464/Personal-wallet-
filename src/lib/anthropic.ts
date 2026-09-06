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

  const tokenFlowLines = stats.tokenFlows
    .slice(0, 30)
    .map(
      (f) =>
        `- ${f.direction === "sent" ? "Sent" : "Received"} ${f.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${f.symbol ?? f.mint} ${
          f.direction === "sent" ? "to" : "from"
        } ${f.counterparty}, across ${f.count} tx`,
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
${topTokens || "(no token transfers)"}

SPL token transfers by counterparty (up to 30, largest first) — use this to answer "who did I send/receive token X to/from and how much":
${tokenFlowLines || "(no per-counterparty token transfer data)"}`;
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

/** Builds a mint -> symbol lookup from a wallet's aggregated token stats, for
 *  labeling raw SPL transfers in the per-transaction prompt with human-readable
 *  symbols instead of bare mint addresses. */
function buildMintSymbolMap(stats: WalletStats): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of stats.tokenTally) if (t.symbol) map.set(t.mint, t.symbol);
  for (const f of stats.tokenFlows) if (f.symbol) map.set(f.mint, f.symbol);
  return map;
}

function formatTransactionsForPrompt(
  transactions: Transaction[],
  walletAddress: string,
  mintSymbols: Map<string, string>,
): string {
  if (transactions.length === 0) return "(no transactions synced)";

  return transactions
    .map((tx) => {
      const net = netSolForWallet(tx, walletAddress);
      const netStr = `${net > 0 ? "+" : ""}${net.toFixed(4)} SOL`;
      const date = new Date(tx.timestamp * 1000).toISOString().slice(0, 10);
      const desc = tx.description ? tx.description.slice(0, 160) : "(no description)";

      const tokenLines = tx.tokenTransfers
        .filter((tt) => tt.fromUserAccount === walletAddress || tt.toUserAccount === walletAddress)
        .map((tt) => {
          const outbound = tt.fromUserAccount === walletAddress;
          const counterparty = outbound ? tt.toUserAccount : tt.fromUserAccount;
          const symbol = mintSymbols.get(tt.mint) ?? tt.mint;
          return `${outbound ? "sent" : "received"} ${tt.tokenAmount} ${symbol}${
            counterparty ? ` ${outbound ? "to" : "from"} ${counterparty}` : ""
          }`;
        });
      const tokenStr = tokenLines.length > 0 ? ` | tokens: ${tokenLines.join("; ")}` : "";

      return `- ${date} | ${tx.source !== "UNKNOWN" ? tx.source : tx.type} | net ${netStr} | ${desc}${tokenStr} | sig: ${tx.signature}`;
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
  const mintSymbols = buildMintSymbolMap(stats);

  const prompt = `${formatStatsForPrompt(stats)}

Most recent transactions (up to ${recentTransactions.length}), oldest data has been summarized above — use these for specifics like dates, counterparties, and signatures:
${formatTransactionsForPrompt(recentTransactions, stats.address, mintSymbols)}

Question about this wallet: ${question}`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    system:
      "You are a crypto investigative analyst helping someone understand a Solana wallet's activity, including specific SPL token transfers (e.g. \"where did I send token X and how much\"). Answer the user's question using only the aggregated stats and transaction data provided — do not invent addresses, amounts, or events that aren't in the data. When asked about a specific token by name, match it against the token symbols/names shown in the stats and transfer data (tokens may not be well-known and are identified by mint address if no symbol was resolved). Reference specific counterparty addresses, amounts, token symbols, or transaction signatures where they support your answer — e.g. list each recipient address and how much of the token was sent to it. If the provided data is insufficient to fully answer (e.g. the token or transaction isn't present in what was synced), say so explicitly and explain what's missing rather than guessing. Keep the answer focused and under 300 words unless the question requires a list.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

/**
 * Answers a free-form investigative question across every tracked wallet at
 * once (e.g. "which of my wallets sent BAWLS, and to whom?"), grounded in
 * each wallet's aggregated stats plus a sample of its most recent raw
 * transactions.
 */
export async function answerPortfolioQuestion(
  question: string,
  perWalletStats: WalletStats[],
  merged: {
    totalInflowSol: number;
    totalOutflowSol: number;
    netSol: number;
    txCount: number;
  },
  recentTransactionsByAddress: Map<string, Transaction[]>,
): Promise<string> {
  const walletSections = perWalletStats
    .map((stats) => {
      const recent = recentTransactionsByAddress.get(stats.address) ?? [];
      const mintSymbols = buildMintSymbolMap(stats);
      return `=== Wallet: ${stats.label ?? stats.address} (${stats.address}) ===
${formatStatsForPrompt(stats)}

Recent transactions for this wallet (up to ${recent.length}):
${formatTransactionsForPrompt(recent, stats.address, mintSymbols)}`;
    })
    .join("\n\n");

  const prompt = `Portfolio overview across ${perWalletStats.length} wallet(s):
Total received: ${merged.totalInflowSol.toFixed(4)} SOL
Total sent: ${merged.totalOutflowSol.toFixed(4)} SOL
Net change: ${merged.netSol.toFixed(4)} SOL
Total transactions: ${merged.txCount}

${walletSections}

Question about this portfolio, which may concern any single wallet above, a comparison between wallets, or the portfolio as a whole: ${question}`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1800,
    system:
      "You are a crypto investigative analyst helping someone understand activity across several Solana wallets they track together as one portfolio, including specific SPL token transfers (e.g. \"which wallet sent token X, to whom, and how much\"). Answer the user's question using only the per-wallet stats and transaction data provided — do not invent addresses, amounts, wallets, or events that aren't in the data. When a question could involve any wallet, check all of them and state which wallet(s) the answer is based on (by label or address). Reference specific counterparty addresses, amounts, token symbols, or transaction signatures where they support your answer. If the provided data is insufficient to fully answer, say so explicitly and explain what's missing rather than guessing. Keep the answer focused and under 350 words unless the question requires a list.",
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
