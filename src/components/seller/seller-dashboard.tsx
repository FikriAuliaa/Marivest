"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { createSellerFundingAction } from "@/app/actions/seller";
import { changePasswordAction, changeProfileNameAction, markNotificationReadAction } from "@/app/actions/buyer";
import type { ActionResult, NotificationView, SellerFundingView, SellerOrderView, SellerProductView } from "@/lib/domain/types";
import { Icon, type IconName } from "@/components/home/icons";
import { StoreRevenueDashboard } from "@/components/funding/store-revenue-dashboard";
import type { StoreRevenueMonth } from "@/lib/domain/store-revenue";
import styles from "./seller.module.css";

type Business = {id:string;name:string;verification_status:string};
type Tab="home"|"shop"|"funding"|"notifications"|"profile";
const nav:{id:Tab;label:string;icon:IconName}[]=[
  {id:"home",label:"Beranda",icon:"home"},{id:"shop",label:"Toko",icon:"shopping-bag"},
  {id:"funding",label:"Pendanaan",icon:"wallet"},{id:"notifications",label:"Notifikasi",icon:"bell"},
];
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
const percent=(raised:number,target:number)=>target?Math.min(100,Math.round(raised/target*100)):0;

export function SellerDashboard({fullName,businesses,products,projects,orders,notifications,storeHistory,initialTab,dataError}:{
  fullName:string;businesses:Business[];products:SellerProductView[];projects:SellerFundingView[];
  storeHistory:StoreRevenueMonth[];
  orders:SellerOrderView[];notifications:NotificationView[];initialTab:Tab;dataError:string|null;
}) {
  const router=useRouter();
  const [tab,setTab]=useState<Tab>(initialTab);
  const [menu,setMenu]=useState(false);
  const [showFunding,setShowFunding]=useState(false);
  const [fundingPhotoPreview,setFundingPhotoPreview]=useState<string|null>(null);
  const [fundingPhotoError,setFundingPhotoError]=useState("");
  useEffect(()=>()=>{ if(fundingPhotoPreview) URL.revokeObjectURL(fundingPhotoPreview); },[fundingPhotoPreview]);
  const [showName,setShowName]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [name,setName]=useState(fullName);
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>{const interval=setInterval(()=>router.refresh(),15000);return()=>clearInterval(interval);},[router]);
  const initials=fullName.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()??"").join("")||"S";
  const totalOrders=products.reduce((sum,product)=>sum+product.revenue,0);
  const waitingOrders=orders.filter(o=>o.status==="pending").length;
  const approved=businesses.filter(b=>b.verification_status==="approved");

  async function run(action:()=>Promise<ActionResult>,after?:()=>void) {
    if(busy)return;
    setBusy(true);setNotice("");
    try{const response=await action();setNotice(response.message);if(response.status==="success"){after?.();router.refresh();}}
    catch{setNotice("Layanan belum dapat dihubungi.");}
    finally{setBusy(false);}
  }
  function fundingPhotoChanged(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    setFundingPhotoError("");
    if(file && (!/\.(jpg|jpeg|png)$/i.test(file.name) || !["image/jpeg","image/png"].includes(file.type) || file.size>5*1024*1024 || file.size===0)) {
      event.target.value="";
      setFundingPhotoPreview(null);
      setFundingPhotoError("Gunakan gambar JPG, JPEG, atau PNG maksimal 5 MB. Format JFIF tidak didukung.");
      return;
    }
    setFundingPhotoPreview(file?URL.createObjectURL(file):null);
  }
  async function createFunding(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;
    if(fundingPhotoError)return;
    await run(()=>createSellerFundingAction(new FormData(form)),()=>{
      form.reset();setFundingPhotoPreview(null);setShowFunding(false);
    });
  }
  const productList=(list:SellerProductView[])=>list.length?<div className={styles.products}>{list.map(p=><article key={p.id} className={styles.product}>
    <div className={styles.thumbnail}><Image src={p.image} fill unoptimized sizes="88px" alt={p.name}/></div>
    <div className={styles.productDetails}><strong>{p.name}</strong><span>{money(p.price)}/{p.unit}</span>
      <small>Stok {p.stock} {p.unit} · {p.isPublished?"Dipublikasikan":"Disembunyikan"}</small>
      <small>Nilai pesanan terverifikasi: {money(p.revenue)}</small></div>
  </article>)}</div>:<div className={styles.empty}>Belum ada produk. Gunakan tombol + untuk menambahkan produk.</div>;
  const fundingList=(list:SellerFundingView[])=>list.length?<div className={styles.stack}>{list.map(p=><article className={`${styles.panel} ${styles.fundingPanel}`} key={p.id}>
    {p.image?.startsWith("https://") ? <div className={styles.fundingThumbnail}><Image src={p.image} alt={`Foto proyek ${p.title}`} fill unoptimized sizes="440px"/></div> : null}
    <div className={styles.fundingTop}><strong>{p.title}</strong><span className={styles.pill}>{p.verificationStatus==="approved"?"Disetujui":p.verificationStatus==="pending"?"Menunggu verifikasi":"Perlu revisi"}</span></div>
    <div className={styles.metricValue}>{money(p.raised)} <small>dari {money(p.target)}</small></div>
    <div className={styles.track}><span style={{width:`${percent(p.raised,p.target)}%`}}/></div>
    <div className={styles.fundingFooter}><small>{percent(p.raised,p.target)}% terkumpul · Komitmen simulasi</small>
      <Link href={`/seller/funding/${p.id}`} className={styles.fundingAction}>Detail, laporan & verifikasi →</Link>
    </div>
  </article>)}</div>:<div className={styles.empty}>Belum ada proyek pendanaan.</div>;
  const renderHome=()=> <>
    <h1>Halo, {fullName.trim().split(/\s+/)[0]}</h1>
    <div className={styles.hero}><Image src="/images/pon.jpg" fill sizes="(max-width: 480px) 100vw, 480px" alt="Budidaya perikanan"/><div>Kelola usaha perikananmu bersama MARIVEST.</div></div>
    <section className={styles.metrics}><div><span>Nilai pesanan terverifikasi</span><strong>{money(totalOrders)}</strong><small>Simulasi, bukan pembayaran nyata</small></div>
      <div><span>Perlu verifikasi</span><strong>{waitingOrders} pesanan</strong><Link href="/seller/orders">Kelola pesanan →</Link></div></section>
    <div className={styles.sectionHead}><h2>Produk yang dijual</h2><button onClick={()=>setTab("shop")}>Lihat semua</button></div>
    {productList(products.slice(0,3))}
    <div className={styles.sectionHead}><h2>Progress pendanaan</h2><button onClick={()=>setTab("funding")}>Lihat semua</button></div>
    {fundingList(projects.slice(0,3))}
  </>;
  const renderShop=()=> <>
    <h1>Toko Saya</h1>
    <div className={styles.sectionHead}><h2>Pesanan produk</h2><Link href="/seller/orders">Kelola pesanan →</Link></div>
    <div className={styles.panel}><strong>{waitingOrders} pesanan menunggu verifikasi</strong><p className={styles.muted}>Konfirmasi, tandai dikirim, dan selesaikan pesanan dalam halaman khusus.</p><Link className={styles.inlineButton} href="/seller/orders">Buka Halaman Pesanan</Link></div>
    <div className={styles.sectionHead}><h2>Produk toko</h2><Link href="/seller/products/new">+ Tambah produk</Link></div>
    {productList(products)}
  </>;
  const renderFunding=()=> <>
    <h1>Pendanaan Usaha</h1><div className={styles.sectionHead}><h2>Pengajuan pendanaan</h2>
    {approved.length>0?<button onClick={()=>setShowFunding(true)}>+ Ajukan</button>:null}</div>
    {fundingList(projects)}
    <StoreRevenueDashboard history={storeHistory}/>
    {approved.length===0?<p className={styles.muted}>Profil usaha harus disetujui sebelum mengajukan pendanaan.</p>:null}
  </>;
  const renderNotifications=()=> <>
    <h1>Notifikasi</h1>{notifications.length?<div className={styles.stack}>{notifications.map(n=><button className={styles.notification} type="button" key={n.id}
      onClick={()=>!n.isRead&&run(()=>markNotificationReadAction(n.id))}>
      <strong>{n.title}{n.isRead?"":" · Baru"}</strong><span>{n.body}</span>
      <small>{new Date(n.createdAt).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"})}</small>
    </button>)}</div>:<div className={styles.empty}>Belum ada notifikasi.</div>}
  </>;
  const renderProfile=()=> <>
    <button type="button" className={styles.back} onClick={()=>setTab("home")}>← Kembali</button>
    <div className={styles.profileHead}><span className={styles.profileIcon}>{initials}</span><div><h2>{fullName}</h2><p>Pelaku Usaha Perikanan</p></div></div>
    <div className={styles.stack}><button className={styles.profileRow} onClick={()=>setShowName(true)}>Ubah Data Profil <span>›</span></button>
      <button className={styles.profileRow} onClick={()=>setShowPassword(true)}>Ganti Kata Sandi <span>›</span></button>
      <form action={signOutAction}><button type="submit" className={`${styles.profileRow} ${styles.danger}`}>Keluar <span>›</span></button></form></div>
  </>;
  return <main className={styles.page}><div className={styles.device}>
    <header className={styles.top}><strong>MARIVEST</strong><div className={styles.menuWrap}><button className={styles.avatar} aria-label="Menu profil" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{initials}</button>
      {menu?<div className={styles.menu}><button onClick={()=>{setTab("profile");setMenu(false);}}>Lihat Profil Saya</button><form action={signOutAction}><button type="submit" className={styles.danger}>Keluar</button></form></div>:null}
    </div></header>
    {dataError?<p className={styles.error} role="alert">{dataError}</p>:null}{notice?<p className={styles.notice} role="status">{notice}</p>:null}
    <div className={styles.content}>{tab==="home"?renderHome():tab==="shop"?renderShop():tab==="funding"?renderFunding():tab==="notifications"?renderNotifications():renderProfile()}</div>
    {tab!=="profile"?<div className={styles.dock}><nav className={styles.nav}>{nav.map(n=><button key={n.id} type="button" aria-label={n.label} aria-current={tab===n.id?"page":undefined}
      className={tab===n.id?styles.navActive:styles.navItem} onClick={()=>setTab(n.id)}><Icon name={n.icon} size={20}/></button>)}</nav>
      <Link href="/seller/products/new" className={styles.addButton} aria-label="Tambah produk"><Icon name="plus" size={22}/></Link></div>:null}
    {showFunding?<div className={styles.overlay}><section className={styles.sheet}><div className={styles.sheetTitle}><h2>Ajukan Pendanaan</h2><button onClick={()=>setShowFunding(false)}>✕</button></div>
      <form className={styles.form} onSubmit={createFunding}><label>Profil usaha<select name="business_id" required>{approved.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Judul proyek<input name="title" required minLength={3} maxLength={160}/></label>
        <label>Kategori<input name="category" required defaultValue="Budidaya"/></label>
        <label>Tujuan pendanaan<textarea name="purpose" required minLength={5} maxLength={500}/></label>
        <label>Deskripsi<textarea name="description" maxLength={2000}/></label>
        <label>Foto proyek (opsional)<input className={styles.photoInput} name="photo" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={fundingPhotoChanged}/></label>
        <p className={styles.photoHint}>Foto JPG/JPEG/PNG maksimal 5 MB. Diunggah ke Supabase Storage untuk ditampilkan kepada Investor setelah proyek disetujui.</p>
        {fundingPhotoPreview ? <div className={styles.photoPreview}><Image src={fundingPhotoPreview} alt="Pratinjau foto proyek pendanaan" fill unoptimized sizes="440px" /></div> : null}
        {fundingPhotoError ? <p className={styles.error} role="alert">{fundingPhotoError}</p> : null}
        <label>Target dana (Rp)<input name="target_amount" required type="number" min={1} step={1}/></label>
        <label>Durasi kegiatan (bulan)<input name="term_months" required type="number" min={1} max={36} step={1} defaultValue={6}/></label>
        <label>Persentase bagi hasil laba investor (0–100)<input name="investor_share_percent" required type="number" min={0} max={100} step={1} defaultValue={30}/></label>
        <label>Risiko utama usaha<textarea name="risk_summary" required minLength={20} maxLength={2000} rows={4} placeholder="Contoh: penyakit ikan, fluktuasi harga pakan, cuaca, dan gagal panen"/></label>
        <p className={styles.muted}>Nisbah adalah bagian laba, bukan bunga tetap. Jika rugi, tidak ada bagi hasil positif. Pengajuan memerlukan verifikasi SuperAdmin dan tidak ada pencairan dana.</p>
        <button className={styles.primary} disabled={busy} type="submit">{busy?"Menyimpan...":"Ajukan Pendanaan"}</button>
      </form></section></div>:null}
    {showName?<div className={styles.overlay}><section className={styles.sheet}><div className={styles.sheetTitle}><h2>Ubah Data Profil</h2><button onClick={()=>setShowName(false)}>✕</button></div>
      <div className={styles.form}><label>Nama lengkap<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
      <button className={styles.primary} disabled={busy} onClick={()=>run(()=>changeProfileNameAction(name),()=>setShowName(false))}>Simpan Profil</button></div></section></div>:null}
    {showPassword?<div className={styles.overlay}><section className={styles.sheet}><div className={styles.sheetTitle}><h2>Ganti Kata Sandi</h2><button onClick={()=>setShowPassword(false)}>✕</button></div>
      <div className={styles.form}><label>Kata sandi baru<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label>Konfirmasi kata sandi<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        <button className={styles.primary} disabled={busy} onClick={()=>run(()=>changePasswordAction(password,confirm),()=>{setShowPassword(false);setPassword("");setConfirm("");})}>Ganti Kata Sandi</button>
      </div></section></div>:null}
  </div></main>;
}
