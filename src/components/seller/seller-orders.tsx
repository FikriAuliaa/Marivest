"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SellerOrderView } from "@/lib/domain/types";
import { sellerOrderAction } from "@/app/actions/seller";
import styles from "./seller.module.css";

const currency = (v:number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
const statusLabel: Record<SellerOrderView["status"],string> = {
  pending:"Menunggu konfirmasi",confirmed:"Terverifikasi",completed:"Selesai",cancelled:"Dibatalkan",
};
const paymentLabel: Record<string,string> = { qris:"QRIS",bank_transfer:"Transfer Bank",ovo:"OVO",dana:"DANA",shopeepay:"ShopeePay",credit_card:"Kartu Kredit" };

export function SellerOrders({orders,error}: {orders:SellerOrderView[];error:string|null}) {
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState("all");
  useEffect(()=>{const timer=setInterval(()=>router.refresh(),15000);return ()=>clearInterval(timer);},[router]);
  async function update(item:SellerOrderView,status:"confirmed"|"cancelled"|"in_transit"|"delivered") {
    if (busy) return;
    if (status==="cancelled" && !window.confirm("Batalkan pesanan ini?")) return;
    setBusy(item.id);setMessage("");
    try {
      const result=await sellerOrderAction(item.id,status);
      setMessage(result.message);
      if(result.status==="success")router.refresh();
    }catch{setMessage("Server belum dapat dihubungi.");}
    finally{setBusy(null);}
  }
  const displayed=orders.filter((o)=>filter==="all" || (filter==="waiting"&&o.status==="pending") || (filter==="shipping"&&o.status==="confirmed") || (filter==="done"&&(o.status==="completed"||o.status==="cancelled")));
  return <main className={styles.page}><div className={styles.device}>
    <header className={styles.top}><Link href="/dashboard?tab=shop">← Toko</Link><strong>MARIVEST</strong></header>
    <h1>Kelola Pesanan</h1><p className={styles.muted}>Verifikasi pembelian, tandai pengiriman, dan pantau penyelesaian pesanan.</p>
    {error ? <p role="alert" className={styles.error}>{error}</p>:null}
    {message ? <p role="status" className={styles.notice}>{message}</p>:null}
    <div className={styles.filters}>{[["all","Semua"],["waiting","Perlu konfirmasi"],["shipping","Pengiriman"],["done","Riwayat"]].map(([value,label])=><button type="button" key={value} className={filter===value?styles.activeFilter:styles.filter} onClick={()=>setFilter(value)}>{label}</button>)}</div>
    {displayed.length===0 ? <div className={styles.empty}>Belum ada pesanan pada kategori ini.</div>:displayed.map((item)=><article key={item.id} className={styles.panel}>
      <div className={styles.orderTop}><strong>{item.productName}</strong><span className={styles.pill}>{statusLabel[item.status]}</span></div>
      <div className={styles.orderMeta}>{item.quantity} {item.unit} · {currency(item.total)}</div>
      <div className={styles.orderMeta}>Penerima: {item.recipientName}</div>
      <div className={styles.orderMeta}>Telepon: {item.recipientPhone}</div>
      <div className={styles.orderMeta}>Alamat: {item.shippingAddress}</div>
      <div className={styles.orderMeta}>Metode: {paymentLabel[item.paymentMethod] ?? item.paymentMethod} (simulasi)</div>
      <div className={styles.orderMeta}>Pengiriman: {item.shippingStatus==="not_shipped"?"Belum dikirim":item.shippingStatus==="in_transit"?"Dalam pengiriman":"Selesai dikirim"}</div>
      <div className={styles.orderActions}>
        {item.status==="pending" ? <><button disabled={!!busy} className={styles.primary} onClick={()=>update(item,"confirmed")}>Verifikasi Pesanan</button><button disabled={!!busy} className={styles.ghost} onClick={()=>update(item,"cancelled")}>Tolak</button></>:null}
        {item.status==="confirmed"&&item.shippingStatus==="not_shipped" ? <><button disabled={!!busy} className={styles.primary} onClick={()=>update(item,"in_transit")}>Kirim Pesanan</button><button disabled={!!busy} className={styles.ghost} onClick={()=>update(item,"cancelled")}>Batalkan</button></>:null}
        {item.status==="confirmed"&&item.shippingStatus==="in_transit" ? <button disabled={!!busy} className={styles.primary} onClick={()=>update(item,"delivered")}>Tandai Terkirim</button>:null}
      </div>
    </article>)}
  </div></main>;
}
