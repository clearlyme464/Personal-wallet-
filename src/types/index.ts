export interface Wallet {
  address: string;
  label?: string;
  addedAt: string;
  lastSyncedAt?: string;
  syncStatus?: "idle" | "syncing" | "error";
  syncError?: string;
}

export interface TokenTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  tokenAmount: number;
  mint: string;
  tokenStandard?: string;
}

export interface NativeTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount: number; // lamports
}

export interface Transaction {
  walletAddress: string;
  signature: string;
  timestamp: number; // unix seconds
  type: string;
  source: string;
  description?: string;
  fee: number;
  feePayer?: string;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
}

export interface CategoryBreakdownItem {
  category: string;
  outflowSol: number;
  inflowSol: number;
  count: number;
}

export interface CounterpartyBreakdownItem {
  address: string;
  outflowSol: number;
  inflowSol: number;
  count: number;
}

export interface WalletStats {
  address: string;
  label?: string;
  txCount: number;
  totalInflowSol: number;
  totalOutflowSol: number;
  netSol: number;
  totalFeesSol: number;
  firstTxAt: number | null;
  lastTxAt: number | null;
  byCategory: CategoryBreakdownItem[];
  topCounterparties: CounterpartyBreakdownItem[];
}
