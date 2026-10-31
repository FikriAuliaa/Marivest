"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/types";

function errorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials")
  ) {
    return "Email atau password tidak sesuai.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Email belum diverifikasi. Silakan periksa kotak masuk email Anda.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered")
  ) {
    return "Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.";
  }

  return "Terjadi kendala saat menghubungi layanan autentikasi. Silakan coba kembali.";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@") || !password) {
    return {
      status: "error",
      message: "Masukkan email dan password yang valid.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { status: "error", message: errorMessage(error.message) };
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const roleValue = String(formData.get("role") ?? "");

  if (fullName.length < 2) {
    return {
      status: "error",
      message: "Nama lengkap minimal terdiri dari 2 karakter.",
    };
  }

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Masukkan alamat email yang valid." };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password minimal harus terdiri dari 8 karakter.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Konfirmasi password belum sesuai.",
    };
  }

  if (roleValue !== "pelaku_usaha" && roleValue !== "mitra") {
    return {
      status: "error",
      message: "Jenis akun tidak valid. Silakan pilih Pelaku Usaha atau Mitra.",
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const emailRedirectTo = new URL("/auth/callback", origin).toString();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: roleValue,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    return { status: "error", message: errorMessage(error.message) };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message:
      "Pendaftaran berhasil. Silakan periksa email untuk menyelesaikan verifikasi sebelum masuk ke MARIVEST.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
