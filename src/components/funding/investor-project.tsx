"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { commitFundingAction } from "@/app/actions/buyer";
import { fundingPercent, remainingTarget, validateCommitment } from "@/lib/domain/funding";
import type { FinancialSnapshot, FundingPeriod, FundingProjectDetail } from "@/lib/funding/data";
import Image from "next/image";
import { StoreRevenueDashboard } from "./store-revenue-dashboard";
import type { StoreRevenueMonth } from "@/lib/domain/store-revenue";
import { FinancialReport } from "./financial-report";
import styles from "./funding.module.css";

const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);

export function InvestorProject({project,snapshot,periods,storeHistory}: {
  project:FundingProjectDetail;snapshot:FinancialSnapshot;periods:FundingPeriod[];storeHistory:StoreRevenueMonth[];
}) {
  const router=useRouter();
  const [amount,setAmount]=useState("");
  const [busy,setBusy]=useState(false);
  const [acknowledged,setAcknowledged]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const key=useRef<string|null>(null);
  const remaining=remainingTarget(snapshot.total_committed,project.target_amount);
  const funded=project.funding_status==="funded";
  async function submit() {
    const value=Number(amount);
    if (busy||!acknowledged||!validateCommitment(value,remaining)) return;
    if(!key.current)key.current=crypto.randomUUID();
    setBusy(true);setError("");setNotice("");
    try {
      const result=await commitFundingAction(project.id,value,key.current);
      if(result.status==="error")setError(result.message);
      else {setNotice(result.message);setAmount("");setAcknowledged(false);key.current=null;router.refresh();}
    } catch {setError("Koneksi terganggu. Periksa riwayat sebelum mencoba lagi untuk mencegah pencatatan ganda.");}
    finally {setBusy(false);}
  }
  return <main className={styles.page}><div className={styles.device}>
    <header className={styles.top}><Link href="/dashboard?tab=investor" className={styles.back}>← Investasi</Link><span className={styles.brand}>MARIVEST</span></header>
    <div className={styles.hero}><span className={styles.tag}>MARIVEST FINANCIAL · SIMULASI</span>
      <h1>{project.title}</h1><p>{project.business_profiles?.name} · {project.business_profiles?.city || "Indonesia"}</p>
      <div className={styles.flex}><strong>{rupiah(snapshot.total_committed)}</strong><small>Target: {rupiah(project.target_amount)}</small></div>
      <div className={styles.track}><span style={{width:`${fundingPercent(snapshot.total_committed,project.target_amount)}%`}}/></div>
      <div className={styles.flex}><small>{fundingPercent(snapshot.total_committed,project.target_amount).toFixed(1)}% target</small>
        <span className={styles.badge}>{funded?"Target tercapai":"Terbuka"}</span></div>
    </div>
    {project.image_url?.startsWith("https://") ? <div className={styles.projectPhoto}><Image src={project.image_url} alt={`Foto proyek ${project.title}`} fill unoptimized sizes="500px" /></div> : null}
    <section className={styles.card}><h2>Rincian proyek</h2><p>{project.description||"Tidak ada deskripsi tambahan."}</p>
      <div className={styles.rows}>
        <div className={styles.row}><span>Tujuan penggunaan dana</span><strong>{project.purpose}</strong></div>
        <div className={styles.row}><span>Kategori</span><strong>{project.category}</strong></div>
        <div className={styles.row}><span>Periode kegiatan</span><strong>{project.term_months?`${project.term_months} bulan`:"Belum dicantumkan"}</strong></div>
        <div className={styles.row}><span>Jumlah investor</span><strong>{snapshot.investor_count} orang</strong></div>
        <div className={styles.row}><span>Sisa target</span><strong>{rupiah(remaining)}</strong></div>
      </div>
      <h3>Risiko usaha</h3><p>{project.risk_summary||"Risiko belum dirinci pada proyek lama. Jangan mengambil keputusan hanya dari ilustrasi hasil."}</p>
      <p className={styles.finePrint}>Verifikasi proyek merupakan pemeriksaan administratif, bukan jaminan keberhasilan usaha.</p>
    </section>
    <section className={styles.card}><h2>Komitmen pendanaan</h2>
      <div className={styles.warning}>Pencatatan komitmen tidak memindahkan dana, tidak menjamin laba, dan bukan transaksi investasi nyata.</div>
      {funded?<p>Target komitmen telah terpenuhi. Proyek tetap terbuka untuk melihat laporan, tetapi tidak menerima komitmen baru.</p>
        :<div className={styles.form}>
          <label>Nominal komitmen (Rp)<input type="number" inputMode="numeric" min="1" max={remaining} step="1" value={amount}
            onChange={e=>{setAmount(e.target.value);key.current=null;}} placeholder="Contoh: 2000000"/></label>
          <label style={{display:"flex",flexDirection:"row",alignItems:"start",gap:10,fontSize:11,fontWeight:500,lineHeight:1.6}}>
            <input type="checkbox" style={{minHeight:18,marginTop:3}} checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>
            Saya memahami risiko kerugian, perhitungan hanya ilustratif, dan tidak ada dana sungguhan atau keuntungan yang dijamin.
          </label>
          <button className={styles.button} type="button" disabled={busy||!acknowledged||!validateCommitment(Number(amount),remaining)} onClick={submit}>
            {busy?"Mencatat...":"Catat komitmen simulasi"}
          </button>
        </div>}
      {notice?<p className={styles.status} role="status">{notice}</p>:null}
      {error?<p className={styles.error} role="alert">{error}</p>:null}
    </section>
    <StoreRevenueDashboard history={storeHistory} title="Riwayat omzet toko pengelola"/><FinancialReport snapshot={snapshot} periods={periods} ratio={project.investor_share_ratio} funded={funded} asInvestor/>
    <Link href="/dashboard?tab=investor" className={styles.link}>← Kembali ke daftar pendanaan</Link>
  </div></main>;
}
