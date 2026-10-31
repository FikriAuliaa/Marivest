"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InvestorActionState } from "@/lib/investor/types";

const validTypes = new Set(["individual", "institutional", "impact"]);
const validInterests = new Set(["budidaya", "nelayan", "tambak", "rantai_pasok", "rumput_laut", "umkm"]);

export async function registerInvestorAction(
  _previousState: InvestorActionState,
  formData: FormData,
): Promise<InvestorActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const investorType = String(formData.get("investor_type") ?? "");
  const occupation = String(formData.get("occupation") ?? "").trim();
  const institutionName = String(formData.get("institution_name") ?? "").trim();
  const incomeRaw = String(formData.get("monthly_income") ?? "").trim();
  const interests = formData.getAll("investment_interests").map(String);
  const digitCount = phone.replace(/\D/g, "").length;

  if (!/^[+]?[0-9][0-9 -]{6,20}$/.test(phone) || digitCount < 8 || digitCount > 16) {
    return { status: "error", message: "Nomor WhatsApp harus berisi 8–16 digit." };
  }
  if (city.length < 2 || city.length > 100) return { status: "error", message: "Domisili wajib diisi (2–100 karakter)." };
  if (!validTypes.has(investorType)) return { status: "error", message: "Pilih jenis investor." };
  if (occupation.length < 2 || occupation.length > 100) return { status: "error", message: "Pekerjaan wajib diisi (2–100 karakter)." };
  if (investorType === "institutional" && institutionName.length < 2) {
    return { status: "error", message: "Nama institusi wajib diisi untuk investor institusi." };
  }
  if (institutionName.length > 150) return { status: "error", message: "Nama institusi terlalu panjang." };
  if (reason.length > 500) return { status: "error", message: "Alasan bergabung maksimal 500 karakter." };
  if (interests.length > 6 || interests.some((value) => !validInterests.has(value))) {
    return { status: "error", message: "Minat investasi tidak valid." };
  }

  let income: number | null = null;
  if (incomeRaw !== "") {
    income = Number(incomeRaw);
    if (!Number.isSafeInteger(income) || income < 0 || income > 1_000_000_000_000) {
      return { status: "error", message: "Penghasilan bulanan harus berupa bilangan rupiah yang valid." };
    }
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase.rpc("register_investor", {
    p_phone: phone,
    p_city: city,
    p_reason: reason || null,
    p_investor_type: investorType,
    p_occupation: occupation,
    p_monthly_income: income,
    p_institution_name: institutionName || null,
    p_investment_interests: interests,
  });
  if (error) return { status: "error", message: `Pendaftaran gagal: ${error.message}` };
  revalidatePath("/dashboard");
  redirect("/dashboard?tab=investor");
}

export async function revokeInvestorAction(
  _previousState: InvestorActionState,
  _formData: FormData,
): Promise<InvestorActionState> {
  void _previousState;
  void _formData;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { status: "error", message: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase.rpc("revoke_investor_access");
  if (error) return { status: "error", message: `Pencabutan akses gagal: ${error.message}` };
  revalidatePath("/dashboard");
  redirect("/dashboard?tab=profile");
}
