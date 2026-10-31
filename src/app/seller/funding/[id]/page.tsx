import { Suspense } from "react";
import { MobileLoading } from "@/components/ui/mobile-loading";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { loadFundingProject } from "@/lib/funding/data";
import { SellerProject } from "@/components/funding/seller-project";

export default function SellerFundingProjectPage({params}:{params:Promise<{id:string}>}) {
  return <Suspense fallback={<MobileLoading title="Memuat proyek usaha..." description="Menyiapkan data proyek dan laporan"/>}><SellerFundingContent params={params}/></Suspense>;
}
async function SellerFundingContent({params}:{params:Promise<{id:string}>}) {
  await connection();
  const profile=await requireProfile();
  if(profile.role!=="pelaku_usaha")redirect("/dashboard");
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const data=await loadFundingProject(id);
  if(!data||data.project.business_profiles?.owner_id!==profile.id)notFound();
  return <SellerProject project={data.project} snapshot={data.snapshot} periods={data.periods} storeHistory={data.storeHistory} reviews={data.reviews} entries={data.entries}/>;
}
