import type { FinancialSnapshot, FundingPeriod } from "@/lib/funding/data";
import styles from "./funding.module.css";

const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);

export function FinancialReport({snapshot,periods,ratio,funded,asInvestor}: {
  snapshot:FinancialSnapshot;periods:FundingPeriod[];ratio:number;funded:boolean;asInvestor:boolean;
}) {
  const status = snapshot.net_profit>0?"Laba bersih":snapshot.net_profit===0?"Impas":"Rugi bersih";
  return <>
    <section className={styles.card}>
      <h2>Transparansi hasil usaha</h2>
      <p>Hanya pendapatan dan biaya yang dicatat untuk proyek ini. Penjualan Marketplace tidak otomatis dihitung.</p>
      <div className={styles.metricGrid}>
        <div className={styles.metric}><span>Pendapatan proyek</span><strong>{rupiah(snapshot.total_revenue)}</strong></div>
        <div className={styles.metric}><span>Biaya proyek</span><strong>{rupiah(snapshot.total_cost)}</strong></div>
      </div>
      <div className={styles.rows}>
        <div className={styles.row}><span>{status}</span><strong>{rupiah(snapshot.net_profit)}</strong></div>
        <div className={styles.row}><span>Nisbah kelompok Investor</span><strong>{Math.round(ratio*10_000)/100}% dari laba positif</strong></div>
        <div className={styles.row}><span>Alokasi ilustratif kelompok Investor</span><strong>{rupiah(snapshot.allocated_to_investors)}</strong></div>
        <div className={styles.row}><span>Alokasi ilustratif Pelaku Usaha</span><strong>{rupiah(snapshot.seller_share)}</strong></div>
        <div className={styles.row}><span>Sisa pembulatan ke Pelaku Usaha</span><strong>{rupiah(snapshot.rounding_to_seller)}</strong></div>
        {asInvestor?<><div className={styles.row}><span>Total komitmen Anda</span><strong>{rupiah(snapshot.my_commitment)}</strong></div>
          <div className={styles.row}><span>Ilustrasi bagian laba Anda</span><strong>{rupiah(snapshot.my_profit_share)}</strong></div></>:null}
      </div>
      {!funded?<div className={styles.warning}>Alokasi bagi hasil belum dihitung karena target pendanaan belum tercapai. Nilai di atas bukan hak tagih dan bukan pembayaran.</div>:null}
      {snapshot.net_profit<=0?<div className={styles.warning}>Saat impas atau rugi, tidak ada alokasi laba positif. Mekanisme penggantian modal atau pembagian kerugian belum menjadi bagian dari prototipe ini.</div>:null}
      <p className={styles.finePrint}>Semua angka adalah simulasi berdasarkan pencatatan Pelaku Usaha, belum diaudit, bukan keuntungan yang dijamin, bukan bukti transfer, dan bukan penetapan kesesuaian akad syariah.</p>
    </section>
    <section className={styles.card}>
      <h2>Riwayat laporan bulanan proyek</h2>
      {periods.length ? periods.map(row=><div className={styles.period} key={row.period_month}>
        <span>{new Date(row.period_month+"T00:00:00").toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</span>
        <strong>Pendapatan<br/>{rupiah(row.revenue)}</strong>
        <strong>Biaya<br/>{rupiah(row.cost)}<br/>Neto: {rupiah(row.net)}</strong>
      </div>) : <div className={styles.empty}>Belum ada laporan keuangan khusus proyek ini. Riwayat omzet Marketplace toko ditampilkan terpisah di bagian atas.</div>}
    </section>
  </>;
}
