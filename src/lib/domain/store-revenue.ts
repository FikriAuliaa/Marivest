/** Ringkasan omzet pesanan simulasi terkonfirmasi. Bukan penerimaan kas atau laba proyek. */
export type StoreRevenueMonth = {
  monthStart: string;
  verifiedOrderValue: number;
  verifiedOrderCount: number;
};

export type StoreRevenueRow = {
  month_start: string;
  verified_order_value: number | string;
  verified_order_count: number | string;
};

export function storeRevenueFromRow(row: StoreRevenueRow): StoreRevenueMonth {
  return {
    monthStart: row.month_start,
    verifiedOrderValue: Number(row.verified_order_value),
    verifiedOrderCount: Number(row.verified_order_count),
  };
}

/** Gabungkan beberapa usaha milik Seller tanpa menghitung bulan yang sama dua kali. */
export function mergeStoreHistories(histories: StoreRevenueMonth[][]): StoreRevenueMonth[] {
  const byMonth = new Map<string, StoreRevenueMonth>();
  for (const rows of histories) {
    for (const row of rows) {
      const previous = byMonth.get(row.monthStart);
      byMonth.set(row.monthStart, {
        monthStart: row.monthStart,
        verifiedOrderValue: (previous?.verifiedOrderValue ?? 0) + row.verifiedOrderValue,
        verifiedOrderCount: (previous?.verifiedOrderCount ?? 0) + row.verifiedOrderCount,
      });
    }
  }
  return [...byMonth.values()].sort((a, b) => a.monthStart.localeCompare(b.monthStart));
}
