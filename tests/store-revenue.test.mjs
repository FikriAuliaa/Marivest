import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStoreHistories, storeRevenueFromRow } from '../src/lib/domain/store-revenue.ts';

test('Mitra hanya melihat nominal dari data terverifikasi yang sudah diagregasi database', () => {
  const row = storeRevenueFromRow({ month_start:'2026-10-01', verified_order_value:'300000', verified_order_count:'1' });
  assert.deepEqual(row, {monthStart:'2026-10-01',verifiedOrderValue:300000,verifiedOrderCount:1});
});
test('Toko yang belum menerima pesanan tetap memiliki bulan bernilai nol', () => {
  const merged = mergeStoreHistories([
    [{monthStart:'2026-09-01',verifiedOrderValue:0,verifiedOrderCount:0},
     {monthStart:'2026-10-01',verifiedOrderValue:50000,verifiedOrderCount:1}],
    [{monthStart:'2026-10-01',verifiedOrderValue:75000,verifiedOrderCount:2},
     {monthStart:'2026-11-01',verifiedOrderValue:0,verifiedOrderCount:0}],
  ]);
  assert.deepEqual(merged, [
    {monthStart:'2026-09-01',verifiedOrderValue:0,verifiedOrderCount:0},
    {monthStart:'2026-10-01',verifiedOrderValue:125000,verifiedOrderCount:3},
    {monthStart:'2026-11-01',verifiedOrderValue:0,verifiedOrderCount:0},
  ]);
});
