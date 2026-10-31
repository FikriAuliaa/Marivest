import type { StoreRevenueMonth } from "@/lib/domain/store-revenue";
import styles from "./funding.module.css";

const rupiah = (amount: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(amount);

function monthLabel(isoDate: string, format: "short" | "long" = "short") {
  const [year, month] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: format, year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function StoreRevenueDashboard({ history, title = "Riwayat omzet bulanan toko" }: {
  history: StoreRevenueMonth[];
  title?: string;
}) {
  const chart = history.slice(-6);
  const highest = Math.max(1, ...chart.map((item) => item.verifiedOrderValue));
  const lifetimeTotal = history.reduce((total, row) => total + row.verifiedOrderValue, 0);
  const orderCount = history.reduce((total, row) => total + row.verifiedOrderCount, 0);
  const latest = history.at(-1);

  return <section className={styles.card} aria-labelledby="marketplace-history-title">
    <h2 id="marketplace-history-title">{title}</h2>
    <p>Aktivitas Marketplace sejak profil toko dibuat, termasuk bulan sebelum proyek pendanaan disetujui atau didanai.</p>
    <div className={styles.metricGrid}>
      <div className={styles.metric}><span>Total nilai pesanan terverifikasi</span><strong>{rupiah(lifetimeTotal)}</strong></div>
      <div className={styles.metric}><span>Bulan terakhir · {latest ? monthLabel(latest.monthStart) : "-"}</span><strong>{rupiah(latest?.verifiedOrderValue ?? 0)}</strong></div>
    </div>
    <p className={styles.help}>Total {orderCount} pesanan terverifikasi. Angka tidak termasuk ongkir dan biaya pengemasan.</p>
    {history.length ? <>
      <figure className={styles.revenueChart} aria-label="Grafik enam bulan terakhir, nilai pesanan terverifikasi">
        <figcaption>Tren nilai pesanan · 6 bulan terakhir</figcaption>
        <div className={styles.revenueBars}>
          {chart.map((item) => <div className={styles.revenueBarColumn} key={item.monthStart}>
            <strong title={rupiah(item.verifiedOrderValue)}>{item.verifiedOrderValue > 0 ? `${Math.round(item.verifiedOrderValue / 1000).toLocaleString("id-ID")} rb` : "0"}</strong>
            <div className={styles.revenueBarTrack}>
              <div className={styles.revenueBar} style={{ height: `${item.verifiedOrderValue > 0 ? Math.max(5, 100 * item.verifiedOrderValue / highest) : 0}%` }} />
            </div>
            <span>{new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(new Date(item.monthStart + "T00:00:00Z"))}</span>
          </div>)}
        </div>
      </figure>
      <details className={styles.historyDetails}>
        <summary>Lihat seluruh riwayat sejak toko dibuat</summary>
        <div className={styles.rows}>
          {[...history].reverse().map((item) => <div className={styles.row} key={item.monthStart}>
            <span>{monthLabel(item.monthStart, "long")}<small className={styles.historyCount}>{item.verifiedOrderCount} pesanan</small></span>
            <strong>{rupiah(item.verifiedOrderValue)}</strong>
          </div>)}
        </div>
      </details>
    </> : <div className={styles.empty}>Riwayat toko belum tersedia.</div>}
    <p className={styles.finePrint}>Omzet di sini adalah nilai produk dari pesanan yang telah diverifikasi penjual, bukan uang yang telah diterima dan bukan laba. Semua transaksi bersifat simulasi. Laporan ini terpisah dari pencatatan pendapatan proyek investasi.</p>
  </section>;
}
