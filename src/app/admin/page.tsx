import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { AdminReview } from "@/components/funding/admin-review";

export const instant = false;

type Project = {
  id:string;title:string;purpose:string;target_amount:number;term_months:number|null;risk_summary:string|null;
  investor_share_ratio:number;verification_status:string;
  business_profiles:{name:string;verification_status:string}|null;
};
type Business = {id:string;name:string;category:string;city:string;description:string;verification_status:string};
export default async function AdminPage() {
  const profile=await requireRole("superadmin");
  const supabase=await createClient();
  const [projectsResult,businessesResult]=await Promise.all([
    supabase.from("funding_projects").select("id,title,purpose,target_amount,term_months,risk_summary,investor_share_ratio,verification_status,business_profiles(name,verification_status)")
      .in("verification_status",["pending","needs_revision"]).order("created_at",{ascending:true}),
    supabase.from("business_profiles").select("id,name,category,city,description,verification_status")
      .in("verification_status",["pending","needs_revision"]).order("created_at",{ascending:true}),
  ]);
  return <main className="min-h-screen bg-[#08152d] px-5 py-9 text-white">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header className="flex items-center justify-between gap-4"><strong className="text-xs tracking-[.22em]">MARIVEST · ADMIN</strong>
        <form action={signOutAction}><button type="submit" className="rounded-full border border-white/25 px-4 py-2 text-xs">Keluar</button></form>
      </header>
      <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 sm:p-9">
        <h1 className="text-3xl font-bold tracking-tight">Halo, {profile.fullName}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Verifikasi administratif usaha dan pengajuan pendanaan. Persetujuan tidak menjamin kelayakan, keuntungan, atau kepatuhan syariah.</p>
      </div>
      {projectsResult.error||businessesResult.error?<p className="rounded-xl bg-rose-100 p-4 text-rose-900">Data verifikasi belum dapat dimuat. Periksa migration dan RLS.</p>:null}
      <AdminReview projects={(projectsResult.data??[]) as unknown as Project[]} businesses={(businessesResult.data??[]) as Business[]}/>
    </div>
  </main>;
}
