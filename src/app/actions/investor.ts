"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InvestorActionState } from "@/lib/investor/types";

function mapInvestorError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("only mitra") || normalized.includes("role mitra")) {
    return "Pendaftaran Investor hanya tersedia untuk akun Mitra.";
  }

  if (normalized.includes("authentication required")) {
    return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  }

  if (normalized.includes("phone") || normalized.includes("nomor whatsapp")) {
    return "Nomor WhatsApp tidak valid. Gunakan 8–16 digit angka.";
  }

  if (normalized.includes("city") || normalized.includes("domisili")) {
    return "Domisili wajib diisi dengan benar.";
  }

  if (normalized.includes("not active") || normalized.includes("no active investor")) {
    return "Status Investor aktif tidak ditemukan.";
  }

  return "Permintaan belum dapat diproses. Pastikan migrasi Investor sudah diterapkan, lalu coba kembali.";
}

export async function registerInvestorAction(
  _previousState: InvestorActionState,
  formData: FormData,
): Promise<InvestorActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const digitCount = phone.replace(/\D/g, "").length;

  if (digitCount < 8 || digitCount > 16) {
    return {
      status: "error",
      message: "Nomor WhatsApp harus berisi 8–16 digit angka.",
    };
  }

  if (city.length < 2 || city.length > 100) {
    return {
      status: "error",
      message: "Domisili wajib diisi (2–100 karakter).",
    };
  }

  if (reason.length > 500) {
    return {
      status: "error",
      message: "Alasan bergabung maksimal 500 karakter.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Sesi Anda tidak valid. Silakan masuk kembali.",
    };
  }

  const { error } = await supabase.rpc("register_investor", {
    p_phone: phone,
    p_city: city,
    p_reason: reason || null,
  });

  if (error) {
    return { status: "error", message: mapInvestorError(error.message) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function revokeInvestorAction(
  _previousState: InvestorActionState,
  _formData: FormData,
): Promise<InvestorActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Sesi Anda tidak valid. Silakan masuk kembali.",
    };
  }

  const { error } = await supabase.rpc("revoke_investor_access");

  if (error) {
    return { status: "error", message: mapInvestorError(error.message) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
