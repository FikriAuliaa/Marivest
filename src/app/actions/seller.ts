"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/domain/types";

function invalid(message: string): ActionResult { return { status: "error", message }; }
const PHOTO_BUCKET = "product-images";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function hasValidPhotoSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (mime === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function sellerClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: roleError } = await supabase.from("profiles")
    .select("role").eq("id", user.id).single();
  if (roleError || profile?.role !== "pelaku_usaha") return null;
  return { supabase, user };
}

export async function createSellerProductAction(formData: FormData): Promise<ActionResult> {
  const auth = await sellerClient();
  if (!auth) return invalid("Akses hanya tersedia untuk Pelaku Usaha.");
  const businessId = String(formData.get("business_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "kg");
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const photo = formData.get("photo");
  if (!uuidPattern.test(businessId) || name.length < 2 || name.length > 150 || category.length < 2 || category.length > 60 ||
      description.length > 1000 || !["kg","pcs","ikat","box"].includes(unit) ||
      !Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000_000 ||
      !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) {
    return invalid("Periksa kembali nama, kategori, satuan, harga, dan stok.");
  }
  if (photo !== null && !(photo instanceof File)) {
    return invalid("Berkas foto tidak valid.");
  }
  if (photo instanceof File && photo.size > 0 &&
      (!PHOTO_TYPES[photo.type] || photo.size > MAX_PHOTO_BYTES)) {
    return invalid("Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.");
  }
  const { data: business, error: checkError } = await auth.supabase.from("business_profiles")
    .select("verification_status").eq("id", businessId).eq("owner_id",auth.user.id).maybeSingle();
  if (checkError || !business || business.verification_status !== "approved") {
    return invalid("Usaha harus disetujui sebelum dapat menjual produk.");
  }
  let imageUrl: string | null = null;
  let uploadedPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!hasValidPhotoSignature(bytes, photo.type)) {
      return invalid("Isi foto tidak sesuai format JPG, PNG, atau WebP.");
    }
    uploadedPath = `${auth.user.id}/${randomUUID()}.${PHOTO_TYPES[photo.type]}`;
    const { error: uploadError } = await auth.supabase.storage.from(PHOTO_BUCKET).upload(uploadedPath, bytes, {
      contentType: photo.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) return invalid("Foto gagal diunggah: " + uploadError.message);
    imageUrl = auth.supabase.storage.from(PHOTO_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
  }

  const { error } = await auth.supabase.from("products").insert({
    business_id: businessId, name, category, description, unit, price, stock,
    image_url: imageUrl, is_published: true,
  });
  if (error) {
    if (uploadedPath) await auth.supabase.storage.from(PHOTO_BUCKET).remove([uploadedPath]);
    return invalid("Produk gagal disimpan: " + error.message);
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "Produk berhasil ditambahkan ke toko." };
}

export async function createSellerFundingAction(formData: FormData): Promise<ActionResult> {
  const auth = await sellerClient();
  if (!auth) return invalid("Akses hanya tersedia untuk Pelaku Usaha.");
  const businessId = String(formData.get("business_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "Budidaya").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const target = Number(formData.get("target_amount"));
  const percent = Number(formData.get("investor_share_percent"));
  if (!uuidPattern.test(businessId) || title.length < 3 || title.length > 160 || purpose.length < 5 || purpose.length > 500 ||
      category.length < 2 || category.length > 80 || description.length > 2000 ||
      !Number.isSafeInteger(target) || target <= 0 || target > 1_000_000_000_000 ||
      !Number.isInteger(percent) || percent < 0 || percent > 100) return invalid("Data pengajuan pendanaan tidak valid.");
  const { data: business, error: bError } = await auth.supabase.from("business_profiles")
    .select("verification_status").eq("id",businessId).eq("owner_id",auth.user.id).maybeSingle();
  if (bError || !business || business.verification_status !== "approved") return invalid("Usaha belum disetujui.");
  const { error } = await auth.supabase.from("funding_projects").insert({
    business_id: businessId, title, category, purpose, description,
    target_amount: target, investor_share_ratio: percent / 100,
  });
  if (error) return invalid("Pengajuan gagal disimpan: " + error.message);
  revalidatePath("/dashboard");
  return { status: "success", message: "Pengajuan pendanaan menunggu persetujuan SuperAdmin." };
}

export async function sellerOrderAction(orderId: string, nextStatus: "confirmed" | "cancelled" | "in_transit" | "delivered", note = ""): Promise<ActionResult> {
  if (!uuidPattern.test(orderId) || note.length > 250) return invalid("Data pesanan tidak valid.");
  const auth = await sellerClient();
  if (!auth) return invalid("Akses hanya tersedia untuk Pelaku Usaha.");
  const isShipping = nextStatus === "in_transit" || nextStatus === "delivered";
  const { error } = isShipping
    ? await auth.supabase.rpc("transition_shipping", { p_order_id: orderId, p_next_status: nextStatus, p_shipping_note: note || null })
    : await auth.supabase.rpc("transition_order", { p_order_id: orderId, p_next_status: nextStatus });
  if (error) return invalid("Status pesanan gagal diubah: " + error.message);
  revalidatePath("/seller/orders");
  revalidatePath("/dashboard");
  revalidatePath("/checkout/success");
  return { status: "success", message: nextStatus === "confirmed" ? "Pesanan berhasil diverifikasi. Pembeli telah diberi notifikasi."
    : nextStatus === "in_transit" ? "Pesanan ditandai sebagai dikirim."
    : nextStatus === "delivered" ? "Pengiriman selesai, pesanan dinyatakan selesai." : "Pesanan dibatalkan." };
}
