// Pure functions. All money is integer rupiah; server/RPC remains authoritative.
export function fundingPercent(committed: number, target: number): number {
  return target > 0 ? Math.min(100, (committed / target) * 100) : 0;
}

export function remainingTarget(committed: number, target: number): number {
  return Math.max(0, target - committed);
}

export function validateCommitment(amount: number, remaining: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= remaining;
}
