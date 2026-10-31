"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/domain/types";

export type AdminCollection =
  | "businesses"
  | "funding"
  | "commitments"
  | "products"
  | "orders"
  | "financial";

type AdminPayload = Record<string, string>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (message: string): ActionResult => ({ status: "error", message });
const success = (message: string): ActionResult => ({ status: "success", message });

function text(payload: AdminPayload, key: string, max = 2000): string {
  return (payload[key] ?? "").trim().slice(0, max);
}

function integer(payload: AdminPayload, key: string): number {
  const raw = payload[key] ?? "";
  if (!/^-?\d+$/.test(raw)) return Number.NaN;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : Number.NaN;
}

function validUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
}

function validPeriod(value: string): boolean {
  return validDate(value) && value <= new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}

async function refreshAdminViews() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/seller/orders");
  revalidatePath("/seller/products/new");
  revalidatePath("/checkout");
}

async function logAuthUserChange(
  actorId: string,
  entityId: string,
  action: "create" | "delete",
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
) {
  const admin = createAdminSupabaseClient();
  if (!admin) return { error: new Error("SUPABASE_SECRET_KEY belum dikonfigurasi.") };
  return await admin.from("admin_audit_logs").insert({
    actor_id: actorId,
    entity: "profiles",
    entity_id: entityId,
    action,
    old_data: oldData,
    new_data: newData,
  });
}

export async function createAdminUserAction(input: {
  email: string;
  fullName: string;
  password: string;
  role: "pelaku_usaha" | "mitra";
}): Promise<ActionResult> {
  const actor = await requireRole("superadmin");
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const password = input.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      fullName.length < 2 || fullName.length > 100 ||
      password.length < 10 || password.length > 128 ||
      !["pelaku_usaha", "mitra"].includes(input.role)) {
    return invalid("Periksa email, nama, role, dan kata sandi (minimal 10 karakter).");
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return invalid("Manajemen akun memerlukan SUPABASE_SECRET_KEY di environment server.");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: input.role },
  });

  if (error || !data.user) return invalid(`Akun tidak dapat dibuat: ${error?.message ?? "Respons Auth tidak valid."}`);

  const { data: profileRow, error: profileError } = await admin.from("profiles")
    .update({ full_name: fullName, role: input.role })
    .eq("id", data.user.id)
    .select("id")
    .maybeSingle();

  if (profileError || !profileRow) {
    await admin.auth.admin.deleteUser(data.user.id);
    return invalid(`Profil akun gagal disiapkan: ${profileError?.message ?? "Trigger profil belum membuat baris profiles."}`);
  }

  const audit = await logAuthUserChange(actor.id, data.user.id, "create", null, {
    email,
    full_name: fullName,
    role: input.role,
  });

  if (audit.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return invalid(`Akun dibatalkan karena audit log gagal disimpan: ${audit.error.message}`);
  }

  await refreshAdminViews();
  return success("Akun pengguna berhasil dibuat. Kredensial awal dapat diberikan secara aman kepada pengguna.");
}

export async function deleteAdminUserAction(userId: string): Promise<ActionResult> {
  const actor = await requireRole("superadmin");
  if (!validUuid(userId)) return invalid("ID pengguna tidak valid.");
  if (userId === actor.id) return invalid("Akun SuperAdmin yang sedang digunakan tidak dapat dihapus.");

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("profiles")
    .select("id,full_name,role")
    .eq("id", userId)
    .maybeSingle();

  if (lookupError || !target) return invalid("Pengguna tidak ditemukan.");
  if (target.role === "superadmin") return invalid("Penghapusan akun SuperAdmin lain harus dilakukan manual oleh tim melalui Supabase.");

  const admin = createAdminSupabaseClient();
  if (!admin) return invalid("Penghapusan akun memerlukan SUPABASE_SECRET_KEY di environment server.");

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const audit = await logAuthUserChange(actor.id, userId, "delete", {
    id: target.id,
    full_name: target.full_name,
    role: target.role,
    email: authUser.user?.email ?? null,
  }, null);

  if (audit.error) return invalid(`Penghapusan dibatalkan karena audit log gagal disimpan: ${audit.error.message}`);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return invalid(`Akun gagal dihapus: ${error.message}`);

  await refreshAdminViews();
  return success("Akun berhasil dihapus. Data terkait mengikuti aturan foreign key database.");
}

export async function updateAdminUserAction(
  userId: string,
  input: { fullName: string; role: "pelaku_usaha" | "mitra" },
): Promise<ActionResult> {
  await requireRole("superadmin");
  if (!validUuid(userId) || input.fullName.trim().length < 2 || input.fullName.trim().length > 100 ||
      !["pelaku_usaha", "mitra"].includes(input.role)) {
    return invalid("Nama atau role pengguna tidak valid.");
  }
  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase.from("profiles")
    .select("id,role").eq("id", userId).maybeSingle();
  if (lookupError || !target) return invalid("Pengguna tidak ditemukan.");
  if (target.role === "superadmin") return invalid("Profil SuperAdmin dilindungi dan tidak dapat diubah dari panel ini.");

  const { error } = await supabase.from("profiles")
    .update({ full_name: input.fullName.trim(), role: input.role })
    .eq("id", userId);
  if (error) return invalid(`Profil pengguna gagal diperbarui: ${error.message}`);

  await refreshAdminViews();
  return success("Profil dan role pengguna berhasil diperbarui.");
}

export async function createAdminRecordAction(
  collection: AdminCollection,
  payload: AdminPayload,
): Promise<ActionResult> {
  await requireRole("superadmin");
  const supabase = await createClient();

  if (collection === "businesses") {
    const ownerId = text(payload, "owner_id");
    const name = text(payload, "name", 120);
    const category = text(payload, "category", 80);
    const city = text(payload, "city", 100);
    const description = text(payload, "description", 2000);
    const status = text(payload, "verification_status") || "pending";
    if (!validUuid(ownerId) || name.length < 2 || ![
      "nelayan_tangkap", "pembudidaya_ikan", "petambak", "petani_rumput_laut", "umkm_perikanan",
    ].includes(category) || city.length < 2 || status !== "pending") {
      return invalid("Lengkapi pemilik, nama, kategori, kota, dan status usaha.");
    }
    const { data: owner } = await supabase.from("profiles").select("role").eq("id", ownerId).maybeSingle();
    if (owner?.role !== "pelaku_usaha") return invalid("Pemilik profil usaha harus memiliki role Pelaku Usaha.");
    const { error } = await supabase.from("business_profiles").insert({
      owner_id: ownerId, name, category, city, description, verification_status: status,
    });
    if (error) return invalid(`Usaha gagal ditambahkan: ${error.message}`);
  } else if (collection === "funding") {
    const businessId = text(payload, "business_id");
    const title = text(payload, "title", 160);
    const category = text(payload, "category", 80);
    const purpose = text(payload, "purpose", 500);
    const description = text(payload, "description", 2000);
    const target = integer(payload, "target_amount");
    const sharePercent = integer(payload, "investor_share_percent");
    const termMonths = integer(payload, "term_months");
    const risk = text(payload, "risk_summary", 2000);
    const imageUrl = text(payload, "image_url", 1000);
    const status = text(payload, "verification_status") || "pending";
    if (!validUuid(businessId) || title.length < 3 || category.length < 2 || purpose.length < 5 ||
        !Number.isSafeInteger(target) || target <= 0 || target > 1_000_000_000_000 ||
        !Number.isInteger(sharePercent) || sharePercent < 0 || sharePercent > 100 ||
        !Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36 ||
        risk.length < 20 || (imageUrl && !/^https:\/\//i.test(imageUrl)) || status !== "pending") {
      return invalid("Lengkapi detail proyek, target, nisbah, durasi, risiko, dan status verifikasi.");
    }
    const { data: business } = await supabase.from("business_profiles")
      .select("verification_status").eq("id", businessId).maybeSingle();
    if (!business || business.verification_status !== "approved") {
      return invalid("Proyek pendanaan hanya dapat dibuat untuk profil usaha yang sudah disetujui.");
    }
    const { error } = await supabase.from("funding_projects").insert({
      business_id: businessId,
      title,
      category,
      purpose,
      description,
      target_amount: target,
      investor_share_ratio: sharePercent / 100,
      term_months: termMonths,
      risk_summary: risk,
      image_url: imageUrl || null,
      verification_status: status,
      funding_status: "open",
    });
    if (error) return invalid(`Proyek pendanaan gagal ditambahkan: ${error.message}`);
  } else if (collection === "commitments") {
    const projectId = text(payload, "project_id");
    const investorId = text(payload, "investor_id");
    const amount = integer(payload, "amount");
    if (!validUuid(projectId) || !validUuid(investorId) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) {
      return invalid("Pilih proyek, investor, dan nominal komitmen yang valid.");
    }
    const { error } = await supabase.rpc("admin_create_funding_commitment", {
      p_project_id: projectId,
      p_investor_id: investorId,
      p_amount: amount,
    });
    if (error) return invalid(`Komitmen simulasi gagal ditambahkan: ${error.message}`);
  } else if (collection === "products") {
    const businessId = text(payload, "business_id");
    const name = text(payload, "name", 160);
    const category = text(payload, "category", 80);
    const description = text(payload, "description", 2000);
    const price = integer(payload, "price");
    const stock = integer(payload, "stock");
    const unit = text(payload, "unit", 30);
    const imageUrl = text(payload, "image_url", 1000);
    const isPublished = payload.is_published === "true";
    if (!validUuid(businessId) || name.length < 2 || name.length > 150 ||
        category.length < 2 || category.length > 60 ||
        !Number.isSafeInteger(price) || price <= 0 || price > 1_000_000_000_000 ||
        !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000 ||
        !["kg", "pcs", "ikat", "box"].includes(unit) || description.length > 1000 ||
        (imageUrl && !/^https:\/\//i.test(imageUrl))) {
      return invalid("Lengkapi data produk, harga, satuan, dan stok yang valid.");
    }
    const { data: business } = await supabase.from("business_profiles")
      .select("verification_status").eq("id", businessId).maybeSingle();
    if (!business) return invalid("Profil usaha tidak ditemukan.");
    if (isPublished && business.verification_status !== "approved") {
      return invalid("Produk hanya dapat dipublikasikan jika profil usaha telah disetujui.");
    }
    const { error } = await supabase.from("products").insert({
      business_id: businessId, name, category, description, price, stock,
      unit, image_url: imageUrl || null, is_published: isPublished,
    });
    if (error) return invalid(`Produk gagal ditambahkan: ${error.message}`);
  } else if (collection === "orders") {
    const productId = text(payload, "product_id");
    const buyerId = text(payload, "buyer_id");
    const quantity = integer(payload, "quantity");
    if (!validUuid(productId) || !validUuid(buyerId) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
      return invalid("Pilih produk, pembeli, dan kuantitas yang valid.");
    }
    const { error } = await supabase.rpc("admin_create_order", {
      p_product_id: productId,
      p_buyer_id: buyerId,
      p_quantity: quantity,
    });
    if (error) return invalid(`Pesanan simulasi gagal ditambahkan: ${error.message}`);
  } else if (collection === "financial") {
    const businessId = text(payload, "business_id");
    const projectId = text(payload, "project_id");
    const type = text(payload, "type");
    const amount = integer(payload, "amount");
    const period = text(payload, "period");
    const note = text(payload, "note", 500);
    if (!validUuid(businessId) || (projectId && !validUuid(projectId)) ||
        !["revenue", "cost"].includes(type) || !Number.isSafeInteger(amount) ||
        amount < 0 || amount > 1_000_000_000_000 || !validPeriod(period) || note.length < 3) {
      return invalid("Lengkapi jenis, nominal, periode, dan keterangan pencatatan.");
    }
    if (projectId) {
      const { data: project } = await supabase.from("funding_projects")
        .select("business_id,verification_status,funding_status").eq("id", projectId).maybeSingle();
      if (!project || project.business_id !== businessId) {
        return invalid("Proyek harus berasal dari profil usaha yang dipilih.");
      }
      if (project.verification_status !== "approved" || project.funding_status !== "funded") {
        return invalid("Pencatatan proyek hanya tersedia setelah proyek disetujui dan target simulasi tercapai.");
      }
    }
    const { error } = await supabase.from("financial_entries").insert({
      business_id: businessId, project_id: projectId || null, type, amount, period, note,
    });
    if (error) return invalid(`Catatan keuangan gagal ditambahkan: ${error.message}`);
  }

  await refreshAdminViews();
  return success("Data berhasil ditambahkan.");
}

export async function updateAdminRecordAction(
  collection: AdminCollection,
  recordId: string,
  payload: AdminPayload,
): Promise<ActionResult> {
  await requireRole("superadmin");
  if (!validUuid(recordId)) return invalid("ID data tidak valid.");
  const supabase = await createClient();

  if (collection === "businesses") {
    const name = text(payload, "name", 120);
    const category = text(payload, "category", 80);
    const city = text(payload, "city", 100);
    const description = text(payload, "description", 2000);
    const status = text(payload, "verification_status");
    const reviewNote = text(payload, "review_note", 1000);
    if (name.length < 2 || ![
      "nelayan_tangkap", "pembudidaya_ikan", "petambak", "petani_rumput_laut", "umkm_perikanan",
    ].includes(category) || city.length < 2 || !["pending", "needs_revision", "approved"].includes(status)) {
      return invalid("Data usaha tidak valid.");
    }
    const { data: currentBusiness } = await supabase.from("business_profiles")
      .select("verification_status").eq("id", recordId).maybeSingle();
    if (!currentBusiness) return invalid("Profil usaha tidak ditemukan.");
    if (status === "pending" && currentBusiness.verification_status !== "pending") {
      return invalid("Status verifikasi tidak dapat dikembalikan menjadi menunggu. Gunakan keputusan setujui atau minta revisi.");
    }
    if (status === "needs_revision" && reviewNote.length < 8) {
      return invalid("Alasan revisi wajib diisi minimal 8 karakter.");
    }
    if (status === "needs_revision" && currentBusiness.verification_status === "approved") {
      const [publishedProducts, approvedProjects] = await Promise.all([
        supabase.from("products").select("id").eq("business_id", recordId).eq("is_published", true).limit(1),
        supabase.from("funding_projects").select("id").eq("business_id", recordId).eq("verification_status", "approved").limit(1),
      ]);
      if ((publishedProducts.data?.length ?? 0) > 0 || (approvedProjects.data?.length ?? 0) > 0) {
        return invalid("Nonaktifkan publikasi produk dan selesaikan status proyek pendanaan terlebih dahulu sebelum meminta revisi profil usaha.");
      }
    }
    const { error } = await supabase.from("business_profiles")
      .update({ name, category, city, description }).eq("id", recordId);
    if (error) return invalid(`Usaha gagal diperbarui: ${error.message}`);
    if (status !== currentBusiness.verification_status) {
      const { error: reviewError } = await supabase.rpc("review_business_profile", {
        p_business_id: recordId,
        p_decision: status,
        p_note: reviewNote,
      });
      if (reviewError) return invalid(`Detail usaha tersimpan, tetapi keputusan verifikasi gagal: ${reviewError.message}`);
    }
  } else if (collection === "funding") {
    const title = text(payload, "title", 160);
    const category = text(payload, "category", 80);
    const purpose = text(payload, "purpose", 500);
    const description = text(payload, "description", 2000);
    const target = integer(payload, "target_amount");
    const sharePercent = integer(payload, "investor_share_percent");
    const termMonths = integer(payload, "term_months");
    const risk = text(payload, "risk_summary", 2000);
    const imageUrl = text(payload, "image_url", 1000);
    const status = text(payload, "verification_status");
    if (title.length < 3 || category.length < 2 || purpose.length < 5 || !Number.isSafeInteger(target) || target <= 0 ||
        target > 1_000_000_000_000 || !Number.isInteger(sharePercent) || sharePercent < 0 || sharePercent > 100 ||
        !Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36 ||
        risk.length < 20 || (imageUrl && !/^https:\/\//i.test(imageUrl)) ||
        !["pending", "needs_revision", "approved"].includes(status)) {
      return invalid("Detail proyek pendanaan tidak valid.");
    }
    const reviewNote = text(payload, "review_note", 1000);
    const { data: existingProject } = await supabase.from("funding_projects")
      .select("business_id,verification_status").eq("id", recordId).maybeSingle();
    if (!existingProject) return invalid("Proyek pendanaan tidak ditemukan.");
    if (status === "pending" && existingProject.verification_status !== "pending") {
      return invalid("Status verifikasi tidak dapat dikembalikan menjadi menunggu. Gunakan keputusan setujui atau minta revisi.");
    }
    if (status === "needs_revision" && reviewNote.length < 8) {
      return invalid("Alasan revisi wajib diisi minimal 8 karakter.");
    }
    if (status === "approved") {
      const { data: business } = await supabase.from("business_profiles")
        .select("verification_status").eq("id", existingProject.business_id).maybeSingle();
      if (business?.verification_status !== "approved") {
        return invalid("Proyek tidak dapat disetujui sebelum profil usahanya disetujui.");
      }
    }
    const { data: commitments, error: commitmentError } = await supabase.from("funding_commitments")
      .select("amount").eq("project_id", recordId);
    if (commitmentError) return invalid("Komitmen proyek tidak dapat diverifikasi.");
    const commitmentRows = (commitments ?? []) as { amount: number }[];
    const committed = commitmentRows.reduce((sum, row) => sum + Number(row.amount), 0);
    if (status === "needs_revision" && committed > 0) {
      return invalid("Proyek dengan komitmen investor yang sudah tercatat tidak dapat dikembalikan untuk revisi.");
    }
    if (target < committed) return invalid("Target tidak boleh lebih kecil daripada total komitmen simulasi yang sudah tercatat.");
    const { error } = await supabase.from("funding_projects").update({
      title, category, purpose, description, target_amount: target,
      investor_share_ratio: sharePercent / 100, term_months: termMonths,
      risk_summary: risk, image_url: imageUrl || null,
    }).eq("id", recordId);
    if (error) return invalid(`Proyek pendanaan gagal diperbarui: ${error.message}`);
    if (status !== existingProject.verification_status) {
      const { error: reviewError } = await supabase.rpc("review_funding_project", {
        p_project_id: recordId,
        p_decision: status,
        p_note: reviewNote,
      });
      if (reviewError) return invalid(`Detail proyek tersimpan, tetapi keputusan verifikasi gagal: ${reviewError.message}`);
    }
  } else if (collection === "commitments") {
    return invalid("Komitmen merupakan catatan simulasi; gunakan penghapusan terkendali jika perlu koreksi.");
  } else if (collection === "products") {
    const name = text(payload, "name", 160);
    const category = text(payload, "category", 80);
    const description = text(payload, "description", 2000);
    const price = integer(payload, "price");
    const stock = integer(payload, "stock");
    const unit = text(payload, "unit", 30);
    const imageUrl = text(payload, "image_url", 1000);
    const isPublished = payload.is_published === "true";
    if (name.length < 2 || name.length > 150 || category.length < 2 || category.length > 60 ||
        !Number.isSafeInteger(price) || price <= 0 || price > 1_000_000_000_000 ||
        !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000 ||
        !["kg", "pcs", "ikat", "box"].includes(unit) || description.length > 1000 ||
        (imageUrl && !/^https:\/\//i.test(imageUrl))) {
      return invalid("Data produk tidak valid.");
    }
    const { data: product } = await supabase.from("products")
      .select("business_id").eq("id", recordId).maybeSingle();
    if (!product) return invalid("Produk tidak ditemukan.");
    if (isPublished) {
      const { data: business } = await supabase.from("business_profiles")
        .select("verification_status").eq("id", product.business_id).maybeSingle();
      if (business?.verification_status !== "approved") return invalid("Produk tidak dapat dipublikasikan sebelum usaha disetujui.");
    }
    const { error } = await supabase.from("products").update({
      name, category, description, price, stock, unit,
      image_url: imageUrl || null, is_published: isPublished,
    }).eq("id", recordId);
    if (error) return invalid(`Produk gagal diperbarui: ${error.message}`);
  } else if (collection === "orders") {
    const status = text(payload, "status");
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) return invalid("Status pesanan tidak valid.");
    const { error } = await supabase.rpc("admin_update_order_status", {
      p_order_id: recordId,
      p_next_status: status,
    });
    if (error) return invalid(`Status pesanan gagal diperbarui: ${error.message}`);
  } else if (collection === "financial") {
    const type = text(payload, "type");
    const amount = integer(payload, "amount");
    const period = text(payload, "period");
    const note = text(payload, "note", 500);
    if (!["revenue", "cost"].includes(type) || !Number.isSafeInteger(amount) || amount < 0 ||
        amount > 1_000_000_000_000 || !validPeriod(period) || note.length < 3) {
      return invalid("Catatan keuangan tidak valid.");
    }
    const { error } = await supabase.from("financial_entries")
      .update({ type, amount, period, note }).eq("id", recordId);
    if (error) return invalid(`Catatan keuangan gagal diperbarui: ${error.message}`);
  }

  await refreshAdminViews();
  return success("Perubahan berhasil disimpan.");
}

export async function deleteAdminRecordAction(
  collection: AdminCollection,
  recordId: string,
): Promise<ActionResult> {
  await requireRole("superadmin");
  if (!validUuid(recordId)) return invalid("ID data tidak valid.");
  const supabase = await createClient();

  if (collection === "businesses") {
    const { error } = await supabase.from("business_profiles").delete().eq("id", recordId);
    if (error) return invalid(`Usaha tidak dapat dihapus. Pastikan tidak ada proyek atau produk yang masih terhubung. Detail: ${error.message}`);
  } else if (collection === "funding") {
    const { error } = await supabase.from("funding_projects").delete().eq("id", recordId);
    if (error) return invalid(`Proyek tidak dapat dihapus. Periksa komitmen dan laporan keuangan yang masih terhubung. Detail: ${error.message}`);
  } else if (collection === "commitments") {
    const { error } = await supabase.rpc("admin_delete_funding_commitment", { p_commitment_id: recordId });
    if (error) return invalid(`Komitmen tidak dapat dihapus: ${error.message}`);
  } else if (collection === "products") {
    const { error } = await supabase.from("products").delete().eq("id", recordId);
    if (error) return invalid(`Produk tidak dapat dihapus jika masih memiliki riwayat pesanan. Detail: ${error.message}`);
  } else if (collection === "orders") {
    const { error } = await supabase.rpc("admin_delete_order", { p_order_id: recordId });
    if (error) return invalid(`Pesanan tidak dapat dihapus: ${error.message}`);
  } else if (collection === "financial") {
    const { error } = await supabase.from("financial_entries").delete().eq("id", recordId);
    if (error) return invalid(`Catatan keuangan gagal dihapus: ${error.message}`);
  }

  await refreshAdminViews();
  return success("Data berhasil dihapus dan aktivitasnya dicatat pada audit log.");
}
