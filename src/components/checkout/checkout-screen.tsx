"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { checkoutCartAction } from "@/app/actions/buyer";
import type { CartView, PaymentMethod } from "@/lib/domain/types";
import { checkoutSummary, SIMULATED_SHIPPING_FEE, SIMULATED_HANDLING_FEE } from "@/lib/domain/checkout";
import styles from "./checkout.module.css";

const methods: { value: PaymentMethod; label: string }[] = [
  { value: "qris", label: "QRIS" },
  { value: "bank_transfer", label: "Transfer Bank" },
  { value: "ovo", label: "OVO" },
  { value: "dana", label: "DANA" },
  { value: "shopeepay", label: "ShopeePay" },
  { value: "credit_card", label: "Kartu Kredit" },
];
const shippingFee = SIMULATED_SHIPPING_FEE;
const handlingFee = SIMULATED_HANDLING_FEE;
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function CheckoutScreen({ name, cart, dataError }: { name: string; cart: CartView[]; dataError: string | null }) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [recipientName, setRecipientName] = useState(name);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const summary = cart.length > 0 ? checkoutSummary(cart.map(({ product, quantity }) => ({ price: product.price, quantity }))) : null;
  const subtotal = summary?.subtotal ?? 0;
  const grandTotal = summary?.total ?? 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !cart.length) return;
    setBusy(true);setError("");
    try {
      const key = idempotencyKey.current ?? crypto.randomUUID();
      idempotencyKey.current = key;
      const response = await checkoutCartAction({ method, recipientName, phone, address, idempotencyKey: key });
      if (response.status === "success" && response.checkoutId) {
        router.replace(`/checkout/success?order=${encodeURIComponent(response.checkoutId)}`);
      } else setError(response.message);
    } catch { setError("Gagal menghubungi layanan. Silakan coba kembali."); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <div className={styles.device}>
      <div className={styles.top}><Link href="/dashboard?tab=marketplace">← Kembali</Link><strong>MARIVEST</strong></div>
      <h1>Halaman Pembayaran</h1>
      {dataError ? <p role="alert" className={styles.error}>{dataError}</p> : null}
      {cart.length === 0 ? <div className={styles.card}><p>Keranjang kosong. Tambahkan produk terlebih dahulu.</p><Link href="/dashboard?tab=marketplace">Buka Marketplace</Link></div>
      : <form onSubmit={submit} className={styles.stack}>
        <section className={styles.card}>
          <h2>Total Pesanan</h2>
          {cart.map((item) => <div key={item.id} className={styles.item}>
            <div className={styles.picture}><Image src={item.product.image} fill unoptimized sizes="60px" alt={item.product.name}/></div>
            <div><strong>{item.product.name}</strong><small>{item.quantity} {item.product.unit} × {money(item.product.price)}</small></div>
            <b>{money(item.quantity * item.product.price)}</b>
          </div>)}
        </section>
        <section className={styles.card}>
          <h2>Rincian Biaya</h2>
          <div className={styles.amount}><span>Subtotal produk</span><b>{money(subtotal)}</b></div>
          <div className={styles.amount}><span>Biaya ongkir (tarif simulasi)</span><b>{money(shippingFee)}</b></div>
          <div className={styles.amount}><span>Biaya penanganan (pengemasan)</span><b>{money(handlingFee)}</b></div>
          <div className={`${styles.amount} ${styles.total}`}><span>Total pembayaran</span><strong>{money(grandTotal)}</strong></div>
        </section>
        <section className={styles.card}>
          <h2>Informasi Pengiriman</h2>
          <label>Nama penerima<input required minLength={2} maxLength={120} value={recipientName} onChange={(e) => setRecipientName(e.target.value)}/></label>
          <label>Nomor telepon penerima<input required type="tel" inputMode="tel" placeholder="081234567890" value={phone} onChange={(e) => setPhone(e.target.value)}/></label>
          <label>Alamat pengiriman<textarea required minLength={8} maxLength={500} rows={3} placeholder="Alamat lengkap penerima" value={address} onChange={(e) => setAddress(e.target.value)}/></label>
        </section>
        <section className={styles.card}>
          <h2>Metode Pembayaran</h2>
          <label>Pilih metode
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <p className={styles.note}>Metode hanya berupa pilihan untuk simulasi. Tidak ada pembayaran atau transfer dana nyata.</p>
        </section>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <button className={styles.primary} type="submit" disabled={busy}>{busy ? "Memproses..." : "Simulasikan Pembayaran"}</button>
      </form>}
    </div>
  </main>;
}
