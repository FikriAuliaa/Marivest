"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { recordFundingFinancialAction, resubmitSellerFundingAction, updateFundingProjectPhotoAction } from "@/app/actions/seller";
import { fundingPercent } from "@/lib/domain/funding";
import type { FundingEntry, FundingPeriod, FundingProjectDetail, FundingReview, FinancialSnapshot } from "@/lib/funding/data";
import Image from "next/image";
import { StoreRevenueDashboard } from "./store-revenue-dashboard";
import type { StoreRevenueMonth } from "@/lib/domain/store-revenue";
import { FinancialReport } from "./financial-report";
import styles from "./funding.module.css";

const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function SellerProject({project,snapshot,periods,reviews,entries,storeHistory}: {
  project:FundingProjectDetail;snapshot:FinancialSnapshot;periods:FundingPeriod[];reviews:FundingReview[];entries:FundingEntry[];storeHistory:StoreRevenueMonth[];
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [photoError,setPhotoError]=useState("");
  useEffect(()=>()=>{if(photoPreview) URL.revokeObjectURL(photoPreview);},[photoPreview]);
  function photoChanged(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    setPhotoError("");
    if(file && (!/\.(jpg|jpeg|png)$/i.test(file.name) || !["image/jpeg","image/png"].includes(file.type) || file.size>5*1024*1024 || file.size===0)) {
      event.target.value="";
      setPhotoPreview(null);
      setPhotoError("Gunakan gambar JPG, JPEG, atau PNG maksimal 5 MB, bukan JFIF.");
      return;
    }
    setPhotoPreview(file?URL.createObjectURL(file):null);
  }
  async function savePhoto(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy||photoError)return;
    const form=event.currentTarget;
    setBusy(true);setError("");setMessage("");
    try {
      const result=await updateFundingProjectPhotoAction(new FormData(form));
      if(result.status==="error")setError(result.message);
      else {setMessage(result.message);form.reset();setPhotoPreview(null);router.refresh();}
    } catch {setError("Foto tidak dapat disimpan. Silakan coba lagi.");}
    finally {setBusy(false);}
  }
  const funded=project.funding_status==="funded";
  async function submit(event:FormEvent<HTMLFormElement>,kind:"financial"|"revision") {
    event.preventDefault();if(busy)return;
    const form=event.currentTarget;
    setBusy(true);setError("");setMessage("");
    try {
      const response=kind==="financial"?await recordFundingFinancialAction(new FormData(form)):
        await resubmitSellerFundingAction(new FormData(form));
      if(response.status==="error")setError(response.message);
      else {setMessage(response.message);form.reset();router.refresh();}
    } catch {setError("Tidak dapat menyimpan perubahan. Silakan coba kembali.");}
    finally {setBusy(false);}
  }
  return <main className={styles.page}><div className={styles.device}>
    <header className={styles.top}><Link href="/dashboard?tab=funding" className={styles.back}>← Pendanaan Usaha</Link><span className={styles.brand}>MARIVEST</span></header>
    <div className={styles.hero}><span className={styles.tag}>KELOLA PROYEK · SIMULASI</span><h1>{project.title}</h1><p>{project.business_profiles?.name}</p>
      <div className={styles.flex}><strong>{money(snapshot.total_committed)}</strong><small>dari {money(project.target_amount)}</small></div>
      <div className={styles.track}><span style={{width:`${fundingPercent(snapshot.total_committed,project.target_amount)}%`}}/></div>
      <div className={styles.flex}><small>{fundingPercent(snapshot.total_committed,project.target_amount).toFixed(1)}% · {snapshot.investor_count} Investor</small>
        <span className={styles.badge}>{funded?"Target tercapai":project.verification_status==="approved"?"Terbuka":project.verification_status==="needs_revision"?"Perlu revisi":"Menunggu verifikasi"}</span>
      </div>
    </div>
    {project.image_url?.startsWith("https://") ? <div className={styles.projectPhoto}><Image src={project.image_url} alt={`Foto proyek ${project.title}`} fill unoptimized sizes="500px" /></div> : null}
    <section className={styles.card}><h2>Informasi pengajuan</h2>
      <div className={styles.rows}>
        <div className={styles.row}><span>Tujuan</span><strong>{project.purpose}</strong></div>
        <div className={styles.row}><span>Periode usaha</span><strong>{project.term_months?`${project.term_months} bulan`:"Belum diisi"}</strong></div>
        <div className={styles.row}><span>Target</span><strong>{money(project.target_amount)}</strong></div>
        <div className={styles.row}><span>Nisbah Investor</span><strong>{Math.round(project.investor_share_ratio*100)}% dari laba positif</strong></div>
      </div><h3>Risiko usaha</h3><p>{project.risk_summary||"Belum dicantumkan."}</p>
      <div className={styles.warning}>Pencapaian target merupakan komitmen, bukan uang yang sudah diterima. Perubahan hasil usaha tidak menjamin imbal hasil.</div>
    </section>
    {project.verification_status!=="approved" ? <section className={styles.card}>
      <h2>Foto proyek pendanaan</h2>
      <p>Tambahkan atau ganti gambar proyek sebelum disetujui SuperAdmin. Foto akan terlihat oleh Investor setelah verifikasi.</p>
      <form className={styles.form} onSubmit={savePhoto}>
        <input type="hidden" name="project_id" value={project.id}/>
        <label>Unggah foto JPG/JPEG/PNG (maksimal 5 MB)
          <input className={styles.photoInput} type="file" name="photo" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={photoChanged} required/>
        </label>
        {photoPreview ? <div className={styles.photoPreview}><Image src={photoPreview} fill unoptimized sizes="480px" alt="Pratinjau foto proyek"/></div> : null}
        {photoError ? <p className={styles.error} role="alert">{photoError}</p> : null}
        <button className={styles.button} type="submit" disabled={busy||!!photoError}>{busy?"Mengunggah...":"Simpan foto proyek"}</button>
      </form>
    </section> : null}
    {reviews.length?<section className={styles.card}><h2>Catatan verifikasi</h2>{reviews.map(r=><div className={styles.review} key={r.id}>
      <b>{r.decision==="approved"?"Disetujui":"Perlu revisi"} · {new Date(r.reviewed_at).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"})}</b>
      <p>{r.note||"Disetujui berdasarkan pemeriksaan administratif."}</p>
    </div>)}</section>:null}
    {project.verification_status==="needs_revision"?<section className={styles.card}><h2>Perbaiki pengajuan</h2>
      <p>Perbaiki informasi sesuai catatan SuperAdmin. Pengajuan revisi akan kembali berstatus menunggu verifikasi.</p>
      <form className={styles.form} onSubmit={e=>submit(e,"revision")}>
        <input name="project_id" type="hidden" value={project.id}/>
        <label>Judul proyek<input name="title" defaultValue={project.title} minLength={3} maxLength={160} required/></label>
        <label>Kategori<input name="category" defaultValue={project.category} minLength={2} maxLength={80} required/></label>
        <label>Tujuan penggunaan dana<textarea name="purpose" defaultValue={project.purpose} rows={3} minLength={5} maxLength={500} required/></label>
        <label>Deskripsi<textarea name="description" defaultValue={project.description} rows={3} maxLength={2000}/></label>
        <label>Target (Rp)<input name="target_amount" type="number" min={1} step={1} defaultValue={project.target_amount} required/></label>
        <label>Durasi usaha (bulan)<input name="term_months" type="number" min={1} max={36} step={1} defaultValue={project.term_months??6} required/></label>
        <label>Nisbah laba untuk Investor (%)<input name="investor_share_percent" type="number" min={0} max={100} step={1} defaultValue={Math.round(project.investor_share_ratio*100)} required/></label>
        <label>Risiko utama usaha<textarea name="risk_summary" defaultValue={project.risk_summary??""} rows={4} minLength={20} maxLength={2000} required/></label>
        <button className={styles.button} disabled={busy}>{busy?"Menyimpan...":"Ajukan ulang untuk verifikasi"}</button>
      </form>
    </section>:null}
    {project.verification_status==="approved"&&funded?<section className={styles.card}><h2>Catat laporan hasil usaha</h2>
      <p>Masukkan pendapatan dan biaya proyek ini secara terpisah dari Marketplace. Catatan bersifat append-only dan menjadi dasar ilustrasi bagi hasil.</p>
      <form className={styles.form} onSubmit={e=>submit(e,"financial")}>
        <input type="hidden" name="project_id" value={project.id}/>
        <label>Jenis<select name="type" required><option value="revenue">Pendapatan proyek</option><option value="cost">Biaya proyek</option></select></label>
        <label>Nominal (Rp)<input type="number" name="amount" min={0} step={1} max={1000000000000} required placeholder="Contoh: 6500000"/></label>
        <label>Tanggal kegiatan<input type="date" name="period" required/></label>
        <label>Keterangan<input name="note" minLength={3} maxLength={500} placeholder="Contoh: Hasil panen bulan ini" required/></label>
        <button type="submit" className={styles.button} disabled={busy}>{busy?"Menyimpan...":"Simpan laporan simulasi"}</button>
      </form>
    </section>:<section className={styles.card}><h2>Pelaporan keuangan</h2>
      <div className={styles.empty}>Pelaporan proyek tersedia setelah pengajuan disetujui dan komitmen mencapai 100% dari target.</div>
    </section>}
    {message?<p className={styles.status} role="status">{message}</p>:null}
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    <StoreRevenueDashboard history={storeHistory}/><FinancialReport snapshot={snapshot} periods={periods} ratio={project.investor_share_ratio} funded={funded} asInvestor={false}/>
    {entries.length?<section className={styles.card}><h2>Jejak pencatatan</h2>{entries.map(e=><div className={styles.row} key={e.id}>
      <span>{new Date(e.period+"T00:00:00").toLocaleDateString("id-ID")} · {e.note}</span>
      <strong>{e.type==="revenue"?"Pendapatan":"Biaya"}: {money(e.amount)}</strong>
    </div>)}</section>:null}
    <Link href="/dashboard?tab=funding" className={styles.link}>← Kembali ke Pendanaan Usaha</Link>
  </div></main>;
}
