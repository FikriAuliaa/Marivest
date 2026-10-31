// Illustration only: no guarantee of profit or payout.
export function netProfit(revenue: number, cost: number): number {
  return revenue - cost;
}

export function splitProfit(profit: number, investorRatio: number) {
  if (!Number.isFinite(investorRatio) || investorRatio < 0 || investorRatio > 1) {
    throw new Error("Rasio tidak valid.");
  }
  if (profit <= 0) return { investor: 0, business: profit };
  const investor = Math.floor(profit * investorRatio);
  return { investor, business: profit - investor };
}

export function allocateToInvestors(investorPortion: number, commitments: readonly number[]): number[] {
  const total = commitments.reduce((sum, n) => sum + n, 0);
  if (total <= 0 || investorPortion <= 0) return commitments.map(() => 0);
  return commitments.map((value) => Math.floor((investorPortion * value) / total));
}
