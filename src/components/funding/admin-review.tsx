"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewFundingAction, reviewBusinessAction } from "@/app/actions/funding-admin";

type Project = {
  id:string;title:string;purpose:string;target_amount:number;term_months:number|null;risk_summary:string|null;
  investor_share_ratio:number;verification_status:string;
  business_profiles:{name:string;verification_status:string}|null;
};
type Business = {id:string;name:string;category:string;city:string;description:string;verification_status:string};
const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function AdminReview({projects,businesses}:{projects:Project[];businesses:Business[]}) {
  const router=useRouter();
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function review(kind:"business"|"project",id:string,decision:"approved"|"needs_revision") {
    if(busy)return;
    const note=notes[id]??"";
    if(decision==="needs_revision"&&note.trim().length<8) {setError("Cantumkan alasan revisi minimal 8 karakter.");return;}
    setBusy(id);setMessage("");setError("");
    try {
      const res=kind==="business"?await reviewBusinessAction(id,decision,note):await reviewFundingAction(id,decision,note);
      if(res.status==="error")setError(res.message);
      else {setMessage(res.message);router.refresh();}
    } catch {setError("Tidak dapat menyimpan hasil verifikasi.");}
    finally {setBusy("");}
  }
  const input=(id:string)=><label className="flex flex-col gap-2 text-xs text-slate-300">Catatan verifikasi / alasan revisi
    <textarea className="w-full min-h-20 rounded-xl border border-white/15 bg-white/10 p-3 text-white placeholder:text-slate-400" maxLength={1000}
      placeholder="Catatan untuk Pelaku Usaha" value={notes[id]??""} onChange={e=>setNotes(prev=>({...prev,[id]:e.target.value}))}/>
  </label>;
  const buttons=(kind:"business"|"project",id:string)=><div className="flex flex-wrap gap-3">
    <button type="button" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#08152d] disabled:opacity-60" disabled={!!busy}
      onClick={()=>review(kind,id,"approved")}>{busy===id?"Menyimpan...":"Setujui"}</button>
    <button type="button" className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={!!busy}
      onClick={()=>review(kind,id,"needs_revision")}>Minta revisi</button>
  </div>;
  return <>
    {error?<p className="rounded-xl bg-rose-100 p-3 text-sm text-rose-900" role="alert">{error}</p>:null}
    {message?<p className="rounded-xl bg-emerald-100 p-3 text-sm text-emerald-900" role="status">{message}</p>:null}
    <section className="space-y-4"><h2 className="text-xl font-bold">Verifikasi profil usaha ({businesses.length})</h2>
      {businesses.length?businesses.map(b=><article key={b.id} className="space-y-4 rounded-3xl border border-white/20 bg-white/10 p-5">
        <div><h3 className="font-bold">{b.name}</h3><p className="mt-2 text-xs leading-relaxed text-slate-300">{b.category} · {b.city} · {b.description||"Tanpa deskripsi"}</p></div>
        {input(b.id)}{buttons("business",b.id)}
      </article>):<p className="rounded-2xl border border-white/15 p-5 text-sm text-slate-300">Tidak ada profil usaha menunggu verifikasi.</p>}
    </section>
    <section className="space-y-4"><h2 className="text-xl font-bold">Verifikasi proyek pendanaan ({projects.length})</h2>
      {projects.length?projects.map(p=><article key={p.id} className="space-y-4 rounded-3xl border border-white/20 bg-white/10 p-5">
        <h3 className="font-bold">{p.title}</h3>
        <p className="text-xs leading-relaxed text-slate-300">{p.business_profiles?.name} · {p.purpose}</p>
        <div className="grid grid-cols-2 gap-3 text-xs"><div>Target<br/><strong>{money(p.target_amount)}</strong></div>
          <div>Nisbah Investor<br/><strong>{Math.round(p.investor_share_ratio*100)}%</strong></div>
          <div>Durasi<br/><strong>{p.term_months?`${p.term_months} bulan`:"Belum diisi"}</strong></div>
          <div>Status usaha<br/><strong>{p.business_profiles?.verification_status}</strong></div>
        </div>
        <div><p className="text-xs font-bold">Risiko usaha</p><p className="mt-1 text-xs leading-relaxed text-slate-300">{p.risk_summary||"Belum dinyatakan"}</p></div>
        {input(p.id)}{buttons("project",p.id)}
      </article>):<p className="rounded-2xl border border-white/15 p-5 text-sm text-slate-300">Tidak ada proyek menunggu verifikasi.</p>}
    </section>
  </>;
}
