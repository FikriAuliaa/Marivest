"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/domain/types";

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

function errorResult(message: string): ActionResult {
  return { status: "error", message };
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function setCartQuantityAction(productId: string, quantity: number): Promise<ActionResult> {
  if (!validUuid(productId) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000) {
    return errorResult("Produk atau jumlah tidak valid.");
  }
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { error } = await auth.supabase.rpc("cart_set_quantity", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  if (error) return errorResult(`Keranjang tidak dapat diperbarui: ${error.message}`);
  revalidatePath("/dashboard");
  return { status: "success", message: quantity === 0 ? "Produk dihapus dari keranjang." : "Keranjang diperbarui." };
}

export async function checkoutCartAction(input: {
  method: string;
  recipientName: string;
  phone: string;
  address: string;
  idempotencyKey: string;
}): Promise<ActionResult & { checkoutId?: string }> {
  const allowed = ["qris", "bank_transfer", "ovo", "dana", "shopeepay", "credit_card"];
  if (!allowed.includes(input.method) || !validUuid(input.idempotencyKey) ||
      input.recipientName.trim().length < 2 || input.recipientName.trim().length > 120 ||
      input.address.trim().length < 8 || input.address.trim().length > 500 ||
      input.phone.replace(/\D/g, "").length < 8 || input.phone.replace(/\D/g, "").length > 16) {
    return errorResult("Lengkapi nama penerima, alamat, nomor telepon, dan metode pembayaran.");
  }
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { data, error } = await auth.supabase.rpc("checkout_cart", {
    p_payment_method: input.method,
    p_recipient_name: input.recipientName.trim(),
    p_shipping_phone: input.phone.trim(),
    p_shipping_address: input.address.trim(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error || typeof data !== "string") return errorResult(`Pesanan tidak dapat dibuat: ${error?.message ?? "Respons database tidak valid"}`);
  revalidatePath("/dashboard");
  revalidatePath("/checkout");
  return { status: "success", message: "Pembayaran simulasi tercatat. Menunggu verifikasi penjual.", checkoutId: data };
}

export async function commitFundingAction(projectId: string, amount: number, idempotencyKey: string): Promise<ActionResult> {
  if (!validUuid(projectId) || !validUuid(idempotencyKey) || !Number.isSafeInteger(amount) || amount <= 0) {
    return errorResult("Nominal atau proyek tidak valid.");
  }
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { error } = await auth.supabase.rpc("commit_funding", {
    p_project_id: projectId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (error) return errorResult(`Komitmen gagal: ${error.message}`);
  revalidatePath("/dashboard");
  return { status: "success", message: "Komitmen pendanaan tercatat. Tidak ada transfer dana." };
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  if (!validUuid(notificationId)) return errorResult("Notifikasi tidak valid.");
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { error } = await auth.supabase.from("notifications")
    .update({ is_read: true }).eq("id", notificationId).eq("user_id", auth.user.id);
  if (error) return errorResult("Tidak dapat memperbarui notifikasi.");
  revalidatePath("/dashboard");
  return { status: "success", message: "Notifikasi ditandai telah dibaca." };
}

export async function changeProfileNameAction(fullName: string): Promise<ActionResult> {
  const trimmed = fullName.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return errorResult("Nama harus terdiri dari 2–100 karakter.");
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { error } = await auth.supabase.from("profiles")
    .update({ full_name: trimmed }).eq("id", auth.user.id);
  if (error) return errorResult("Nama profil gagal diperbarui.");
  revalidatePath("/dashboard");
  return { status: "success", message: "Profil berhasil diperbarui." };
}

export async function changePasswordAction(password: string, confirmation: string): Promise<ActionResult> {
  if (password.length < 8 || password !== confirmation) return errorResult("Password minimal 8 karakter dan konfirmasinya harus sama.");
  const auth = await authenticatedClient();
  if (!auth) return errorResult("Silakan masuk kembali.");
  const { error } = await auth.supabase.auth.updateUser({ password });
  if (error) return errorResult("Password tidak dapat diubah. Silakan masuk ulang dan coba lagi.");
  return { status: "success", message: "Kata sandi berhasil diperbarui." };
}
