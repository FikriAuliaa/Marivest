"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./checkout.module.css";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const labels: Record<string,string> = { qris: "QRIS",bank_transfer:"Transfer Bank",ovo:"OVO",dana:"DANA",shopeepay:"ShopeePay",credit_card:"Kartu Kredit" };
export function CheckoutSuccess({ orderId,total,paymentMethod,status }: { orderId: string; total:number; paymentMethod:string; status:"pending"|"verified"|"shipped"|"completed"|"mixed" }) {
  const router=useRouter();
  useEffect(() => { const timer=setInterval(()=>router.refresh(),12000);return ()=>clearInterval(timer); },[router]);
  const heading=status==="pending" ? "Menunggu verifikasi penjual" : status==="verified" ? "Pesanan berhasil dibuat" : status==="shipped" ? "Pesanan sedang dikirim" : status==="completed" ? "Pesanan selesai" : "Ada perubahan status pesanan";
  const detail=status==="pending" ? "Pembayaran simulasi sudah dicatat. Penjual akan memverifikasi pesanan." : status==="verified" ? "Penjual telah mengonfirmasi pesanan. Pengiriman sedang disiapkan." : status==="shipped" ? "Penjual telah menandai pesanan sebagai dikirim." : status==="completed" ? "Pengiriman telah dinyatakan selesai." : "Periksa rincian setiap produk melalui Riwayat Pesanan.";
  return <main className={styles.page}><section className={styles.device}>
    <header className={styles.top}><Link href="/dashboard?tab=marketplace">← Marketplace</Link><strong>MARIVEST</strong></header>
    <div className={styles.successIcon}>✓</div>
    <h1>{heading}</h1><p className={styles.note}>{detail}</p>
    <section className={styles.card}><div className={styles.amount}><span>Nomor pesanan</span><b>{orderId.slice(0,8).toUpperCase()}</b></div>
      <div className={styles.amount}><span>Metode pembayaran</span><b>{labels[paymentMethod] ?? paymentMethod}</b></div>
      <div className={`${styles.amount} ${styles.total}`}><span>Total simulasi</span><b>{money(total)}</b></div></section>
    <p className={styles.note}>Halaman ini memeriksa perubahan status secara berkala. Tidak ada dana yang ditransfer.</p>
    <Link className={styles.primary} href="/dashboard?tab=marketplace">Kembali ke Marketplace</Link>
  </section></main>;
}
