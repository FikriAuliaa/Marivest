// Pure business rules for a simulated profit-sharing scenario.
// bigint throughout: no floating-point arithmetic for rupiah or rounding.
export type SimulatedProfitShare = {
  profit: bigint;
  investorPool: bigint;
  sellerShare: bigint;
  roundingToSeller: bigint;
  investorShares: bigint[];
};

export function simulateProfitSharing(input: {
  revenue: bigint;
  cost: bigint;
  investorShareBasisPoints: number;
  commitments: readonly bigint[];
  fullyFunded: boolean;
}): SimulatedProfitShare {
  const { revenue, cost, investorShareBasisPoints: bps, commitments, fullyFunded } = input;
  if (revenue < BigInt(0) || cost < BigInt(0) || !Number.isInteger(bps) || bps < 0 || bps > 10_000 ||
      commitments.some((c) => c < BigInt(0))) throw new Error("Parameter bagi hasil tidak valid.");
  const profit = revenue - cost;
  const total = commitments.reduce((sum, c) => sum + c, BigInt(0));
  if (profit <= BigInt(0) || !fullyFunded || total === BigInt(0)) {
    return { profit, investorPool: BigInt(0), sellerShare: BigInt(0), roundingToSeller: BigInt(0), investorShares: commitments.map(() => BigInt(0)) };
  }
  const investorPool = (profit * BigInt(bps)) / BigInt(10_000);
  const investorShares = commitments.map((value) => (investorPool * value) / total);
  const allocated = investorShares.reduce((sum, value) => sum + value, BigInt(0));
  return { profit, investorPool, sellerShare: profit - allocated,
    roundingToSeller: investorPool - allocated, investorShares };
}

// Backwards-compatible pure helpers used for earlier MVP examples.
export function netProfit(revenue: number, cost: number): number { return revenue - cost; }
export function splitProfit(profit: number, investorRatio: number) {
  if (!Number.isSafeInteger(profit) || !Number.isFinite(investorRatio) || investorRatio < 0 || investorRatio > 1) {
    throw new Error("Rasio atau laba tidak valid.");
  }
  if (profit <= 0) return { investor: 0, business: profit };
  const bps = Math.round(investorRatio * 10_000);
  const investor = Number((BigInt(profit) * BigInt(bps)) / BigInt(10_000));
  return { investor, business: profit - investor };
}
export function allocateToInvestors(investorPortion: number, commitments: readonly number[]): number[] {
  if (!Number.isSafeInteger(investorPortion) || commitments.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Nominal tidak valid.");
  }
  const total = commitments.reduce((sum, n) => sum + BigInt(n), BigInt(0));
  if (total <= 0 || investorPortion <= 0) return commitments.map(() => 0);
  return commitments.map(value => Number((BigInt(investorPortion) * BigInt(value)) / total));
}
