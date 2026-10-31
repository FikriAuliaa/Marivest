"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/domain/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewFundingAction(projectId: string, decision: "approved" | "needs_revision", note: string): Promise<ActionResult> {
  if (!uuidPattern.test(projectId) || !["approved","needs_revision"].includes(decision) ||
      note.trim().length > 1000 || (decision === "needs_revision" && note.trim().length < 8)) {
    return { status:"error", message:"Keputusan atau catatan verifikasi tidak valid." };
  }
  await requireRole("superadmin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_funding_project",{
    p_project_id:projectId, p_decision:decision, p_note:note.trim(),
  });
  if (error) return { status:"error", message:"Verifikasi gagal: " + error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { status:"success", message:decision === "approved" ? "Proyek disetujui dan terbuka bagi Investor aktif." : "Proyek dikembalikan kepada Pelaku Usaha untuk revisi." };
}

export async function reviewBusinessAction(businessId:string,decision:"approved"|"needs_revision",note:string):Promise<ActionResult> {
  if(!uuidPattern.test(businessId)||!["approved","needs_revision"].includes(decision)||
     note.trim().length>1000||(decision==="needs_revision"&&note.trim().length<8)) {
    return {status:"error",message:"Data verifikasi usaha tidak valid."};
  }
  await requireRole("superadmin");
  const supabase=await createClient();
  const {error}=await supabase.rpc("review_business_profile",{
    p_business_id:businessId,p_decision:decision,p_note:note.trim(),
  });
  if(error)return {status:"error",message:"Verifikasi usaha gagal: "+error.message};
  revalidatePath("/admin");revalidatePath("/dashboard");
  return {status:"success",message:"Status verifikasi usaha diperbarui."};
}
