import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateProfitSharing } from '../src/lib/domain/profit-sharing.ts';

test('Mina Bahari: 30/70 and proportional commitments', () => {
  const result = simulateProfitSharing({revenue:6_500_000n,cost:5_500_000n,investorShareBasisPoints:3000,commitments:[2_000_000n,3_000_000n],fullyFunded:true});
  assert.equal(result.profit,1_000_000n);
  assert.equal(result.investorPool,300_000n);
  assert.deepEqual(result.investorShares,[120_000n,180_000n]);
  assert.equal(result.sellerShare,700_000n);
});
test('unallocated rupiah from flooring belongs to seller', () => {
  const result = simulateProfitSharing({revenue:101n,cost:0n,investorShareBasisPoints:5000,commitments:[1n,1n,1n],fullyFunded:true});
  assert.equal(result.investorPool,50n);
  assert.deepEqual(result.investorShares,[16n,16n,16n]);
  assert.equal(result.roundingToSeller,2n);
  assert.equal(result.sellerShare,53n);
});
test('loss, break even, or unfilled target never generates positive allocation', () => {
  for(const [revenue,cost,fullyFunded] of [[100n,200n,true],[200n,200n,true],[400n,200n,false]]) {
    const result=simulateProfitSharing({revenue,cost,investorShareBasisPoints:3000,commitments:[2n,3n],fullyFunded});
    assert.deepEqual(result.investorShares,[0n,0n]);
    assert.equal(result.sellerShare,0n);
  }
});
test('invalid ratios and negative inputs rejected', () => {
  assert.throws(()=>simulateProfitSharing({revenue:10n,cost:1n,investorShareBasisPoints:10001,commitments:[1n],fullyFunded:true}));
  assert.throws(()=>simulateProfitSharing({revenue:10n,cost:1n,investorShareBasisPoints:5000,commitments:[-1n],fullyFunded:true}));
});
