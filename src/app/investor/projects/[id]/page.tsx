import { Suspense } from "react";
import { MobileLoading } from "@/components/ui/mobile-loading";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { loadFundingProject } from "@/lib/funding/data";
import { InvestorProject } from "@/components/funding/investor-project";

export default function InvestorProjectPage({params}:{params:Promise<{id:string}>}) {
  return <Suspense fallback={<MobileLoading title="Memuat rincian pendanaan..." description="Menyiapkan data proyek dan laporan"/>}><InvestorProjectContent params={params}/></Suspense>;
}
async function InvestorProjectContent({params}:{params:Promise<{id:string}>}) {
  await connection();
  const profile=await requireProfile();
  if(profile.role!=="mitra")redirect("/dashboard");
  const supabase=await createClient();
  const { data: registration }=await supabase.from("investor_registrations").select("status")
    .eq("user_id",profile.id).maybeSingle();
  if(registration?.status!=="active")redirect("/dashboard?tab=investor");
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const data=await loadFundingProject(id);
  if(!data||data.project.verification_status!=="approved"||data.project.business_profiles?.verification_status!=="approved")notFound();
  return <InvestorProject project={data.project} snapshot={data.snapshot} periods={data.periods} storeHistory={data.storeHistory}/>;
}
