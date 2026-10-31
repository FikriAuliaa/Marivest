"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/domain/types";

function invalid(message: string): ActionResult { return { status: "error", message }; }
const PHOTO_BUCKET = "product-images";
const FUNDING_PHOTO_BUCKET = "funding-images";
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


async function uploadFundingPhoto(
  auth: NonNullable<Awaited<ReturnType<typeof sellerClient>>>, photo: FormDataEntryValue | null,
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  if (photo === null) return { url: null, path: null, error: null };
  if (!(photo instanceof File)) return { url: null, path: null, error: "Berkas gambar proyek tidak valid." };
  if (photo.size === 0 && photo.name === "") return { url: null, path: null, error: null };
  const extension = photo.name.toLowerCase().split(".").pop();
  const correctExtension = photo.type === "image/jpeg" ? extension === "jpg" || extension === "jpeg"
    : photo.type === "image/png" && extension === "png";
  if (!correctExtension || photo.size < 1 || photo.size > MAX_PHOTO_BYTES) {
    return { url: null, path: null, error: "Gambar proyek hanya boleh JPG, JPEG, atau PNG maksimal 5 MB (bukan JFIF)." };
  }
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!hasValidPhotoSignature(bytes, photo.type)) {
    return { url: null, path: null, error: "Isi gambar tidak sesuai dengan format JPEG atau PNG." };
  }
  const fileExtension = photo.type === "image/png" ? "png" : "jpg";
  const path = `${auth.user.id}/${randomUUID()}.${fileExtension}`;
  const { error } = await auth.supabase.storage.from(FUNDING_PHOTO_BUCKET).upload(path, bytes, {
    contentType: photo.type, cacheControl: "3600", upsert: false,
  });
  if (error) return { url: null, path: null, error: "Upload gambar gagal: " + error.message };
  return {
    url: auth.supabase.storage.from(FUNDING_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl,
    path,
    error: null,
  };
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
  const termMonths = Number(formData.get("term_months"));
  const riskSummary = String(formData.get("risk_summary") ?? "").trim();
  const photo = formData.get("photo");
  if (!uuidPattern.test(businessId) || title.length < 3 || title.length > 160 || purpose.length < 5 || purpose.length > 500 ||
      category.length < 2 || category.length > 80 || description.length > 2000 ||
      !Number.isSafeInteger(target) || target <= 0 || target > 1_000_000_000_000 ||
      !Number.isInteger(percent) || percent < 0 || percent > 100 ||
      !Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36 ||
      riskSummary.length < 20 || riskSummary.length > 2000) return invalid("Lengkapi durasi dan risiko usaha dengan benar.");
  const { data: business, error: bError } = await auth.supabase.from("business_profiles")
    .select("verification_status").eq("id",businessId).eq("owner_id",auth.user.id).maybeSingle();
  if (bError || !business || business.verification_status !== "approved") return invalid("Usaha belum disetujui.");
  const uploaded = await uploadFundingPhoto(auth, photo);
  if (uploaded.error) return invalid(uploaded.error);
  const { error } = await auth.supabase.from("funding_projects").insert({
    business_id: businessId, title, category, purpose, description,
    target_amount: target, investor_share_ratio: percent / 100,
    term_months: termMonths, risk_summary: riskSummary, image_url: uploaded.url,
  });
  if (error) {
    if (uploaded.path) await auth.supabase.storage.from(FUNDING_PHOTO_BUCKET).remove([uploaded.path]);
    return invalid("Pengajuan gagal disimpan: " + error.message);
  }
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { status: "success", message: "Pengajuan pendanaan menunggu persetujuan SuperAdmin." };
}

export async function updateFundingProjectPhotoAction(formData: FormData): Promise<ActionResult> {
  const auth = await sellerClient();
  if (!auth) return invalid("Akses hanya tersedia untuk Pelaku Usaha.");
  const projectId = String(formData.get("project_id") ?? "");
  const photo = formData.get("photo");
  if (!uuidPattern.test(projectId) || !(photo instanceof File) || photo.size < 1) {
    return invalid("Pilih foto proyek yang valid.");
  }
  const { data: existing, error: lookupError } = await auth.supabase.from("funding_projects")
    .select("id,verification_status,funding_status,business_profiles(owner_id)")
    .eq("id", projectId).maybeSingle();
  const ownerId = (existing?.business_profiles as unknown as {owner_id: string} | null)?.owner_id;
  if (lookupError || !existing || ownerId !== auth.user.id ||
      !["pending","needs_revision"].includes(existing.verification_status) || existing.funding_status !== "open") {
    return invalid("Foto hanya dapat diperbarui untuk pengajuan milikmu yang belum disetujui.");
  }
  const uploaded = await uploadFundingPhoto(auth, photo);
  if (uploaded.error || !uploaded.url) return invalid(uploaded.error ?? "Foto proyek harus diisi.");
  const { data, error } = await auth.supabase.from("funding_projects")
    .update({ image_url: uploaded.url })
    .eq("id", projectId)
    .in("verification_status", ["pending", "needs_revision"])
    .eq("funding_status", "open")
    .select("id").maybeSingle();
  if (error || !data) {
    if (uploaded.path) await auth.supabase.storage.from(FUNDING_PHOTO_BUCKET).remove([uploaded.path]);
    return invalid("Foto gagal disimpan. Pastikan pengajuan belum disetujui SuperAdmin.");
  }
  revalidatePath(`/seller/funding/${projectId}`);
  revalidatePath("/dashboard");
  return { status: "success", message: "Foto proyek berhasil diperbarui dan akan tampil setelah pengajuan disetujui." };
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


export async function recordFundingFinancialAction(formData: FormData): Promise<ActionResult> {
  const auth = await sellerClient();
  if (!auth) return invalid("Hanya Pelaku Usaha yang dapat mencatat hasil usaha.");
  const projectId = String(formData.get("project_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const amount = Number(formData.get("amount"));
  const period = String(formData.get("period") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!uuidPattern.test(projectId) || !["revenue","cost"].includes(type) ||
      !Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000_000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(period) || !Number.isFinite(Date.parse(period)) ||
      period > new Date(Date.now() + 7 * 3600_000).toISOString().slice(0,10) || note.length < 3 || note.length > 500) {
    return invalid("Tanggal, jenis, nominal, atau keterangan pencatatan tidak valid.");
  }
  const { data: project, error: projectError } = await auth.supabase.from("funding_projects")
    .select("business_id,verification_status,funding_status,business_profiles(owner_id)")
    .eq("id",projectId).maybeSingle();
  const owner = (project?.business_profiles as unknown as {owner_id:string} | null)?.owner_id;
  if (projectError || !project || owner !== auth.user.id || project.verification_status !== "approved" || project.funding_status !== "funded") {
    return invalid("Pelaporan hanya tersedia untuk proyek milikmu yang sudah memenuhi target pendanaan.");
  }
  const { error } = await auth.supabase.from("financial_entries").insert({
    business_id: project.business_id, project_id: projectId, type, amount, period, note,
  });
  if (error) return invalid("Pencatatan gagal: " + error.message);
  revalidatePath(`/seller/funding/${projectId}`);
  revalidatePath(`/investor/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { status:"success", message:"Pendapatan atau biaya tercatat untuk proyek ini saja. Tidak ada arus uang nyata." };
}

export async function resubmitSellerFundingAction(formData: FormData): Promise<ActionResult> {
  const auth = await sellerClient();
  if (!auth) return invalid("Akses hanya untuk Pelaku Usaha.");
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const risk = String(formData.get("risk_summary") ?? "").trim();
  const target = Number(formData.get("target_amount"));
  const months = Number(formData.get("term_months"));
  const percent = Number(formData.get("investor_share_percent"));
  if (!uuidPattern.test(projectId) || title.length < 3 || title.length > 160 || category.length < 2 || category.length > 80 ||
      purpose.length < 5 || purpose.length > 500 || description.length > 2000 || risk.length < 20 || risk.length > 2000 ||
      !Number.isSafeInteger(target) || target < 1 || target > 1_000_000_000_000 ||
      !Number.isInteger(months) || months < 1 || months > 36 || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    return invalid("Isi seluruh detail proyek dan informasi risiko dengan benar.");
  }
  const { error } = await auth.supabase.rpc("resubmit_funding_project",{
    p_project_id:projectId, p_title:title, p_category:category, p_purpose:purpose, p_description:description,
    p_target_amount:target, p_investor_share_ratio:percent/100,
    p_term_months:months, p_risk_summary:risk,
  });
  if (error) return invalid("Revisi gagal disimpan: " + error.message);
  revalidatePath(`/seller/funding/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { status:"success", message:"Revisi diajukan ulang untuk diverifikasi SuperAdmin." };
}
