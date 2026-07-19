const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(address: string): boolean {
  return BASE58_RE.test(address.trim());
}

export function parseWalletInput(raw: string): string[] {
  const candidates = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    if (isValidSolanaAddress(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}
