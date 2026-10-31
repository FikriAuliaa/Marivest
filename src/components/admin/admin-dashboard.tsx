"use client";

import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminRecordAction,
  createAdminUserAction,
  deleteAdminRecordAction,
  deleteAdminUserAction,
  updateAdminRecordAction,
  updateAdminUserAction,
  type AdminCollection,
} from "@/app/actions/admin";
import styles from "./admin-dashboard.module.css";

export type AdminRecord = Record<string, unknown> & { id: string };

export type AdminDashboardData = {
  profiles: AdminRecord[];
  businesses: AdminRecord[];
  funding: AdminRecord[];
  commitments: AdminRecord[];
  products: AdminRecord[];
  orders: AdminRecord[];
  financial: AdminRecord[];
  audit: AdminRecord[];
};

type SectionKey = keyof AdminDashboardData | "overview";
type EditableSection = Exclude<SectionKey, "overview" | "audit" | "profiles"> | "profiles";
type FieldType = "text" | "textarea" | "number" | "select" | "date" | "url" | "checkbox" | "password" | "email";
type FieldOption = { label: string; value: string };
type FieldDefinition = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
};
type ColumnDefinition = { key: string; label: string };

const navigation: { id: SectionKey; label: string; icon: string; group: string }[] = [
  { id: "overview", label: "Dashboard", icon: "▦", group: "UTAMA" },
  { id: "profiles", label: "Pengguna", icon: "♙", group: "PENGELOLAAN" },
  { id: "businesses", label: "Profil usaha", icon: "⌂", group: "PENGELOLAAN" },
  { id: "funding", label: "Proyek pendanaan", icon: "◈", group: "FINANCIAL & INVESTMENT" },
  { id: "commitments", label: "Komitmen pendanaan", icon: "◉", group: "FINANCIAL & INVESTMENT" },
  { id: "products", label: "Produk", icon: "▣", group: "MARKETPLACE" },
  { id: "orders", label: "Pesanan", icon: "▤", group: "MARKETPLACE" },
  { id: "financial", label: "Catatan keuangan", icon: "▥", group: "FINANCIAL & INVESTMENT" },
  { id: "audit", label: "Audit aktivitas", icon: "◷", group: "SISTEM" },
];

const columns: Record<Exclude<SectionKey, "overview">, ColumnDefinition[]> = {
  profiles: [
    { key: "full_name", label: "Nama pengguna" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "id", label: "ID akun" },
  ],
  businesses: [
    { key: "name", label: "Nama usaha" },
    { key: "category", label: "Kategori" },
    { key: "city", label: "Kota" },
    { key: "verification_status", label: "Verifikasi" },
  ],
  funding: [
    { key: "title", label: "Nama proyek" },
    { key: "business_id", label: "Usaha" },
    { key: "target_amount", label: "Target dana" },
    { key: "verification_status", label: "Verifikasi" },
    { key: "funding_status", label: "Pendanaan" },
  ],
  commitments: [
    { key: "project_id", label: "Proyek" },
    { key: "investor_id", label: "Investor" },
    { key: "amount", label: "Nominal komitmen" },
    { key: "created_at", label: "Tanggal" },
  ],
  products: [
    { key: "name", label: "Nama produk" },
    { key: "business_id", label: "Penjual" },
    { key: "category", label: "Kategori" },
    { key: "price", label: "Harga" },
    { key: "stock", label: "Stok" },
    { key: "is_published", label: "Publikasi" },
  ],
  orders: [
    { key: "id", label: "ID pesanan" },
    { key: "product_id", label: "Produk" },
    { key: "buyer_id", label: "Pembeli" },
    { key: "quantity", label: "Jumlah" },
    { key: "total_amount", label: "Total pesanan" },
    { key: "status", label: "Status" },
    { key: "shipping_status", label: "Pengiriman" },
  ],
  financial: [
    { key: "type", label: "Jenis" },
    { key: "business_id", label: "Usaha" },
    { key: "project_id", label: "Proyek terkait" },
    { key: "amount", label: "Nominal komitmen" },
    { key: "period", label: "Periode" },
    { key: "note", label: "Keterangan" },
  ],
  audit: [
    { key: "entity", label: "Entitas" },
    { key: "entity_id", label: "ID data" },
    { key: "action", label: "Aktivitas" },
    { key: "actor_id", label: "Pelaksana" },
    { key: "created_at", label: "Waktu" },
    { key: "old_data", label: "Data sebelumnya" },
    { key: "new_data", label: "Data terbaru" },
  ],
};

const titles: Record<SectionKey, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "OVERVIEW / DASHBOARD",
    title: "Selamat datang kembali, Admin",
    description: "Pantau performa MARIVEST dan kelola seluruh aktivitas operasional dari satu tempat.",
  },
  profiles: {
    eyebrow: "PENGELOLAAN / PENGGUNA",
    title: "Manajemen pengguna",
    description: "Kelola akun Pelaku Usaha dan Mitra. Akun SuperAdmin tetap dilindungi dari perubahan melalui panel ini.",
  },
  businesses: {
    eyebrow: "PENGELOLAAN / PROFIL USAHA",
    title: "Manajemen profil usaha",
    description: "Tinjau, perbarui, setujui, atau kelola data profil usaha yang terdaftar.",
  },
  funding: {
    eyebrow: "FINANCIAL & INVESTMENT / PROYEK",
    title: "Manajemen pendanaan",
    description: "Kelola proyek, target, status verifikasi, dan informasi pendanaan.",
  },
  commitments: {
    eyebrow: "FINANCIAL & INVESTMENT / KOMITMEN",
    title: "Komitmen pendanaan",
    description: "Pantau dan kelola catatan komitmen investor untuk setiap proyek pendanaan.",
  },
  products: {
    eyebrow: "MARKETPLACE / PRODUK",
    title: "Manajemen produk",
    description: "Kelola katalog produk, harga, stok, foto, dan status publikasi.",
  },
  orders: {
    eyebrow: "MARKETPLACE / PESANAN",
    title: "Manajemen pesanan",
    description: "Pantau pesanan marketplace dan kelola transisi status sesuai alur operasional.",
  },
  financial: {
    eyebrow: "FINANCIAL & INVESTMENT / PELAPORAN",
    title: "Catatan keuangan",
    description: "Kelola pendapatan dan biaya yang dicatat untuk profil usaha maupun proyek terkait.",
  },
  audit: {
    eyebrow: "SISTEM / AUDIT LOG",
    title: "Riwayat aktivitas admin",
    description: "Telusuri perubahan data yang dilakukan oleh SuperAdmin untuk menjaga akuntabilitas.",
  },
};

function valueOf(record: AdminRecord, key: string): string {
  const value = record[key];
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function rupiah(value: unknown): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function shortId(value: string): string {
  return value.length > 15 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function dateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fieldDefinitions(
  section: SectionKey,
  data: AdminDashboardData,
  editing: boolean,
): FieldDefinition[] {
  const options = (items: AdminRecord[], labelKey: string): FieldOption[] =>
    items.map((item) => ({
      value: valueOf(item, "id"),
      label: `${valueOf(item, labelKey) || "Tanpa nama"} · ${shortId(valueOf(item, "id"))}`,
    }));

  const statusOptions: FieldOption[] = [
    { value: "pending", label: "Menunggu" },
    { value: "needs_revision", label: "Perlu revisi" },
    { value: "approved", label: "Disetujui" },
  ];
  const initialStatusOptions: FieldOption[] = [{ value: "pending", label: "Menunggu verifikasi" }];

  if (section === "profiles") {
    return [
      { key: "full_name", label: "Nama lengkap", type: "text", required: true },
      {
        key: "role",
        label: "Jenis akun",
        type: "select",
        required: true,
        options: [
          { value: "pelaku_usaha", label: "Pelaku Usaha" },
          { value: "mitra", label: "Mitra" },
        ],
      },
    ];
  }
  if (section === "businesses") {
    return [
      ...(!editing ? [{ key: "owner_id", label: "Pemilik akun", type: "select" as const, required: true, options: options(data.profiles.filter((p) => valueOf(p, "role") === "pelaku_usaha"), "full_name") }] : []),
      { key: "name", label: "Nama usaha", type: "text", required: true },
      { key: "category", label: "Kategori usaha", type: "select", required: true, options: [
        { value: "nelayan_tangkap", label: "Nelayan tangkap" },
        { value: "pembudidaya_ikan", label: "Pembudidaya ikan" },
        { value: "petambak", label: "Petambak" },
        { value: "petani_rumput_laut", label: "Petani rumput laut" },
        { value: "umkm_perikanan", label: "UMKM perikanan" },
      ] },
      { key: "city", label: "Kota", type: "text", required: true },
      { key: "description", label: "Deskripsi", type: "textarea" },
      { key: "verification_status", label: "Status verifikasi", type: "select", required: true, options: editing ? statusOptions : initialStatusOptions },
      ...(editing ? [{ key: "review_note", label: "Catatan verifikasi / alasan revisi", type: "textarea" as const, hint: "Wajib diisi minimal 8 karakter jika meminta revisi." }] : []),
    ];
  }
  if (section === "funding") {
    return [
      ...(!editing ? [{ key: "business_id", label: "Profil usaha", type: "select" as const, required: true, options: options(data.businesses, "name") }] : []),
      { key: "title", label: "Nama proyek", type: "text", required: true },
      { key: "category", label: "Kategori proyek", type: "text", required: true },
      { key: "purpose", label: "Tujuan pendanaan", type: "textarea", required: true },
      { key: "description", label: "Deskripsi proyek", type: "textarea" },
      { key: "target_amount", label: "Target dana (Rp)", type: "number", required: true, min: 1 },
      { key: "investor_share_percent", label: "Nisbah investor (%)", type: "number", required: true, min: 0, max: 100 },
      { key: "term_months", label: "Durasi (bulan)", type: "number", required: true, min: 1, max: 36 },
      { key: "risk_summary", label: "Ringkasan risiko", type: "textarea", required: true },
      { key: "image_url", label: "URL gambar proyek", type: "url", hint: "Opsional. Gunakan URL HTTPS." },
      { key: "verification_status", label: "Status verifikasi", type: "select", required: true, options: editing ? statusOptions : initialStatusOptions },
      ...(editing ? [{ key: "review_note", label: "Catatan verifikasi / alasan revisi", type: "textarea" as const, hint: "Wajib diisi minimal 8 karakter jika meminta revisi." }] : []),
    ];
  }
  if (section === "commitments") {
    return [
      { key: "project_id", label: "Proyek pendanaan", type: "select", required: true, options: options(data.funding, "title") },
      { key: "investor_id", label: "Akun Mitra / Investor", type: "select", required: true, options: options(data.profiles.filter((p) => valueOf(p, "role") === "mitra"), "full_name"), hint: "Investor harus memiliki registrasi investor berstatus aktif." },
      { key: "amount", label: "Nominal komitmen (Rp)", type: "number", required: true, min: 1 },
    ];
  }
  if (section === "products") {
    return [
      ...(!editing ? [{ key: "business_id", label: "Penjual / profil usaha", type: "select" as const, required: true, options: options(data.businesses, "name") }] : []),
      { key: "name", label: "Nama produk", type: "text", required: true },
      { key: "category", label: "Kategori", type: "text", required: true },
      { key: "description", label: "Deskripsi", type: "textarea" },
      { key: "price", label: "Harga per satuan (Rp)", type: "number", required: true, min: 1 },
      { key: "unit", label: "Satuan", type: "select", required: true, options: [
        { value: "kg", label: "Kilogram (kg)" },
        { value: "pcs", label: "Pieces (pcs)" },
        { value: "ikat", label: "Ikat" },
        { value: "box", label: "Box" },
      ] },
      { key: "stock", label: "Stok", type: "number", required: true, min: 0 },
      { key: "image_url", label: "URL foto produk", type: "url", hint: "Gunakan URL HTTPS. Upload foto tetap tersedia melalui alur Seller." },
      { key: "is_published", label: "Publikasikan produk", type: "checkbox" },
    ];
  }
  if (section === "orders") {
    if (editing) {
      return [{
        key: "status",
        label: "Status pesanan",
        type: "select",
        required: true,
        options: [
          { value: "pending", label: "Menunggu" },
          { value: "confirmed", label: "Dikonfirmasi" },
          { value: "completed", label: "Selesai" },
          { value: "cancelled", label: "Dibatalkan" },
        ],
      }];
    }
    return [
      { key: "product_id", label: "Produk", type: "select", required: true, options: options(data.products, "name") },
      { key: "buyer_id", label: "Pembeli (Mitra)", type: "select", required: true, options: options(data.profiles.filter((p) => valueOf(p, "role") === "mitra"), "full_name") },
      { key: "quantity", label: "Jumlah", type: "number", required: true, min: 1, max: 1000 },
    ];
  }
  if (section === "financial") {
    return [
      ...(!editing ? [
        { key: "business_id", label: "Profil usaha", type: "select" as const, required: true, options: options(data.businesses, "name") },
        { key: "project_id", label: "Proyek terkait (opsional)", type: "select" as const, options: [{ value: "", label: "Tidak terkait proyek" }, ...options(data.funding, "title")] },
      ] : []),
      { key: "type", label: "Jenis pencatatan", type: "select", required: true, options: [{ value: "revenue", label: "Pendapatan" }, { value: "cost", label: "Biaya" }] },
      { key: "amount", label: "Nominal (Rp)", type: "number", required: true, min: 0 },
      { key: "period", label: "Tanggal pencatatan", type: "date", required: true },
      { key: "note", label: "Keterangan", type: "textarea", required: true },
    ];
  }
  return [];
}

function columnValue(
  section: Exclude<SectionKey, "overview">,
  record: AdminRecord,
  key: string,
  data: AdminDashboardData,
): string {
  const raw = record[key];
  if (raw === null || raw === undefined || raw === "") return "—";
  if (["target_amount", "amount", "price", "total_amount"].includes(key)) return rupiah(raw);
  if (key === "business_id") {
    const business = data.businesses.find((item) => valueOf(item, "id") === String(raw));
    return business ? valueOf(business, "name") : shortId(String(raw));
  }
  if (key === "project_id") {
    const project = data.funding.find((item) => valueOf(item, "id") === String(raw));
    return project ? valueOf(project, "title") : shortId(String(raw));
  }
  if (key === "product_id") {
    const product = data.products.find((item) => valueOf(item, "id") === String(raw));
    return product ? valueOf(product, "name") : shortId(String(raw));
  }
  if (key === "buyer_id" || key === "investor_id" || key === "owner_id" || key === "actor_id") {
    const user = data.profiles.find((item) => valueOf(item, "id") === String(raw));
    return user ? valueOf(user, "full_name") : shortId(String(raw));
  }
  if (key === "created_at" || key === "period" || key === "reviewed_at") return dateLabel(raw);
  if (key === "old_data" || key === "new_data") return JSON.stringify(raw);
  if (key === "is_published") return raw ? "Aktif" : "Draft";
  if (key === "investor_share_ratio") return `${Math.round(Number(raw) * 100)}%`;
  if (key === "id" || key.endsWith("_id")) return shortId(String(raw));
  if (key === "verification_status") {
    return raw === "approved" ? "Disetujui" : raw === "needs_revision" ? "Perlu revisi" : "Menunggu";
  }
  if (key === "funding_status") return raw === "funded" ? "Target tercapai" : "Terbuka";
  if (key === "status" || key === "action" || key === "shipping_status") {
    const labels: Record<string, string> = {
      pending: "Menunggu",
      confirmed: "Dikonfirmasi",
      completed: "Selesai",
      cancelled: "Dibatalkan",
      approved: "Disetujui",
      needs_revision: "Perlu revisi",
      revenue: "Pendapatan",
      cost: "Biaya",
      insert: "Tambah",
      update: "Ubah",
      delete: "Hapus",
      create: "Buat akun",
      not_shipped: "Belum dikirim",
      in_transit: "Dalam pengiriman",
      delivered: "Terkirim",
    };
    return labels[String(raw)] ?? String(raw);
  }
  if (key === "role") return raw === "pelaku_usaha" ? "Pelaku Usaha" : raw === "mitra" ? "Mitra" : "SuperAdmin";
  if (key === "type") return raw === "revenue" ? "Pendapatan" : "Biaya";
  return String(raw);
}

function statusTone(value: string): string {
  if (["approved", "completed", "funded", "true", "delivered"].includes(value)) return styles.statusSuccess;
  if (["pending", "needs_revision", "confirmed", "in_transit"].includes(value)) return styles.statusPending;
  if (["cancelled", "false", "not_shipped"].includes(value)) return styles.statusMuted;
  return "";
}

function activitySeries(orders: AdminRecord[], period: string): { label: string; count: number }[] {
  const now = new Date();
  if (period === "hari") {
    return Array.from({ length: 6 }, (_, index) => {
      const hour = index * 4;
      const count = orders.filter((order) => {
        if (typeof order.created_at !== "string") return false;
        const date = new Date(order.created_at);
        return date.toDateString() === now.toDateString() && date.getHours() >= hour && date.getHours() < hour + 4;
      }).length;
      return { label: `${String(hour).padStart(2, "0")}.00`, count };
    });
  }
  if (period === "tahun") {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const count = orders.filter((order) => {
        if (typeof order.created_at !== "string") return false;
        const created = new Date(order.created_at);
        return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
      }).length;
      return { label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date), count };
    });
  }
  if (period === "bulan") {
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (3 - index) * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const count = orders.filter((order) => {
        if (typeof order.created_at !== "string") return false;
        const created = new Date(order.created_at);
        return created >= start && created < end;
      }).length;
      return { label: `Minggu ${index + 1}`, count };
    });
  }
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const count = orders.filter((order) =>
      typeof order.created_at === "string" && String(order.created_at).slice(0, 10) === key,
    ).length;
    return {
      label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(day),
      count,
    };
  });
}

export function AdminDashboard({
  profileName,
  data,
  dataErrors,
  authAdminAvailable,
  signOutAction,
}: {
  profileName: string;
  data: AdminDashboardData;
  dataErrors: string[];
  authAdminAvailable: boolean;
  signOutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("marivest-admin-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    return saved ? saved === "dark" : prefersDark;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("marivest-admin-sidebar") === "collapsed";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modalSection, setModalSection] = useState<EditableSection | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "user">("create");
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState("bulan");
  const [filterStatus, setFilterStatus] = useState("all");


  useEffect(() => {
    window.localStorage.setItem("marivest-admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem("marivest-admin-sidebar", sidebarCollapsed ? "collapsed" : "expanded");
  }, [sidebarCollapsed]);

  const pendingBusinesses = data.businesses.filter((item) => ["pending", "needs_revision"].includes(valueOf(item, "verification_status")));
  const pendingFunding = data.funding.filter((item) => ["pending", "needs_revision"].includes(valueOf(item, "verification_status")));
  const committedTotal = data.commitments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const completedSales = data.orders
    .filter((item) => valueOf(item, "status") === "completed")
    .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0);
  const dailyOrders = useMemo(() => activitySeries(data.orders, period), [data.orders, period]);
  const maxDailyOrders = Math.max(1, ...dailyOrders.map((item) => item.count));
  const linePoints = dailyOrders.map((item, index) => {
    const x = 14 + (index * 272) / Math.max(1, dailyOrders.length - 1);
    const y = 92 - (item.count / maxDailyOrders) * 68;
    return `${x},${y}`;
  }).join(" ");

  const currentTitle = titles[activeSection];
  const activeRecords = useMemo<AdminRecord[]>(() => {
    if (activeSection === "overview") return [];
    return data[activeSection] as AdminRecord[];
  }, [activeSection, data]);
  const visibleRecords = useMemo(() => {
    if (activeSection === "overview") return [];
    const query = search.trim().toLowerCase();
    return activeRecords.filter((record) => {
      const matchesSearch = !query || JSON.stringify(record).toLowerCase().includes(query);
      const statuses = [valueOf(record, "status"), valueOf(record, "verification_status"), valueOf(record, "funding_status"), valueOf(record, "shipping_status"), valueOf(record, "is_published")];
      const matchesStatus = filterStatus === "all" || statuses.includes(filterStatus);
      return matchesSearch && matchesStatus;
    });
  }, [activeRecords, activeSection, filterStatus, search]);

  function openCreate(section: EditableSection) {
    setSelectedRecord(null);
    setModalSection(section);
    setModalMode(section === "profiles" ? "user" : "create");
    setFeedback(null);
  }

  function openEdit(section: EditableSection, record: AdminRecord) {
    if (section === "commitments") return;
    setSelectedRecord(record);
    setModalSection(section);
    setModalMode("edit");
    setFeedback(null);
  }

  function closeModal() {
    if (isPending) return;
    setModalSection(null);
    setSelectedRecord(null);
  }

  function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalSection) return;
    const form = new FormData(event.currentTarget);
    const values = Array.from(form.entries()).reduce<Record<string, string>>((result, [key, value]) => {
      result[key] = typeof value === "string" ? value : value.name;
      return result;
    }, {});

    startTransition(async () => {
      try {
        let result;
        if (modalMode === "user") {
          result = await createAdminUserAction({
            email: values.email ?? "",
            fullName: values.full_name ?? "",
            password: values.password ?? "",
            role: (values.role ?? "mitra") as "pelaku_usaha" | "mitra",
          });
        } else if (modalSection === "profiles" && modalMode === "edit" && selectedRecord) {
          result = await updateAdminUserAction(selectedRecord.id, {
            fullName: values.full_name ?? "",
            role: (values.role ?? "mitra") as "pelaku_usaha" | "mitra",
          });
        } else if (modalMode === "edit" && selectedRecord) {
          result = await updateAdminRecordAction(modalSection as AdminCollection, selectedRecord.id, values);
        } else {
          result = await createAdminRecordAction(modalSection as AdminCollection, values);
        }

        setFeedback({ kind: result.status, message: result.message });
        if (result.status === "success") {
          setModalSection(null);
          setSelectedRecord(null);
          router.refresh();
        }
      } catch {
        setFeedback({ kind: "error", message: "Terjadi kendala saat menyimpan data. Silakan coba kembali." });
      }
    });
  }

  function removeRecord(section: EditableSection, record: AdminRecord) {
    const label = valueOf(record, "name") || valueOf(record, "title") || valueOf(record, "full_name") || shortId(record.id);
    const warning = section === "profiles"
      ? `Hapus akun ${label}? Data yang terhubung dapat ikut terhapus sesuai foreign key database.`
      : `Hapus data "${label}"? Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(warning)) return;

    startTransition(async () => {
      try {
        const result = section === "profiles"
          ? await deleteAdminUserAction(record.id)
          : await deleteAdminRecordAction(section as AdminCollection, record.id);
        setFeedback({ kind: result.status, message: result.message });
        if (result.status === "success") router.refresh();
      } catch {
        setFeedback({ kind: "error", message: "Data tidak dapat dihapus saat ini. Silakan coba kembali." });
      }
    });
  }

  const groupNames = Array.from(new Set(navigation.map((item) => item.group)));
  const themeClass = darkMode ? styles.dark : styles.light;

  return (
    <div className={`${styles.shell} ${themeClass} ${sidebarCollapsed ? styles.shellCollapsed : ""}`}>
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>M</div>
          <div className={styles.brandText}>
            <strong>MARIVEST</strong>
            <span>SUPERADMIN</span>
          </div>
          <button className={styles.mobileClose} onClick={() => setSidebarOpen(false)} aria-label="Tutup navigasi">×</button>
        </div>

        <div className={styles.sidebarScroll}>
          {groupNames.map((group) => (
            <div className={styles.navGroup} key={group}>
              <p className={styles.navHeading}>{group}</p>
              {navigation.filter((item) => item.group === group).map((item) => (
                <button
                  className={`${styles.navItem} ${activeSection === item.id ? styles.navActive : ""}`}
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); setSearch(""); setFilterStatus("all"); }}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.id === "businesses" && pendingBusinesses.length > 0 ? <span className={styles.navCount}>{pendingBusinesses.length}</span> : null}
                  {item.id === "funding" && pendingFunding.length > 0 ? <span className={styles.navCount}>{pendingFunding.length}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.adminIdentity}>
            <div className={styles.avatar}>AD</div>
            <div className={styles.identityText}>
              <strong>{profileName}</strong>
              <span>SuperAdmin</span>
            </div>
          </div>
          <form action={signOutAction}>
            <button className={styles.signOut} type="submit"><span className={styles.signOutText}>Keluar akun</span><span>↗</span></button>
          </form>
        </div>
      </aside>

      {sidebarOpen ? <button className={styles.mobileScrim} onClick={() => setSidebarOpen(false)} aria-label="Tutup navigasi" /> : null}

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuToggle} onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">☰</button>
            <button className={styles.collapseToggle} onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Perluas navigasi" : "Ciutkan navigasi"}>{sidebarCollapsed ? "→" : "←"}</button>
            <div className={styles.breadcrumb}><span>MARIVEST</span><b>/</b><strong>{navigation.find((item) => item.id === activeSection)?.label ?? "Dashboard"}</strong></div>
          </div>
          <div className={styles.topbarRight}>
            <label className={styles.globalSearch}>
              <span>⌕</span>
              <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Cari data, pengguna, produk..." />
            </label>
            <button className={styles.iconButton} onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "Aktifkan light mode" : "Aktifkan dark mode"}>
              {darkMode ? "☀" : "☾"}
            </button>
            <button className={styles.iconButton} onClick={() => setActiveSection("audit")} aria-label="Lihat aktivitas">♧</button>
            <div className={styles.topAvatar}>AD</div>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageIntro}>
            <div>
              <p className={styles.eyebrow}>{currentTitle.eyebrow}</p>
              <h1>{currentTitle.title}</h1>
              <p className={styles.pageDescription}>{currentTitle.description}</p>
            </div>
            <div className={styles.introActions}>
              {activeSection !== "overview" && activeSection !== "audit" ? (
                <button
                  className={styles.primaryButton}
                  onClick={() => openCreate(activeSection as EditableSection)}
                  disabled={activeSection === "profiles" && !authAdminAvailable}
                  title={activeSection === "profiles" && !authAdminAvailable ? "Konfigurasikan SUPABASE_SECRET_KEY terlebih dahulu" : undefined}
                >
                  <span>＋</span> {activeSection === "profiles" ? "Tambah pengguna" : "Tambah data"}
                </button>
              ) : null}
            </div>
          </div>

          {dataErrors.length > 0 ? (
            <div className={styles.warningBanner}>
              <strong>Beberapa data belum dapat dimuat.</strong>
              <span>Pastikan migration SuperAdmin sudah diterapkan dan RLS mengizinkan akses administratif.</span>
              <details><summary>Lihat detail</summary><ul>{dataErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul></details>
            </div>
          ) : null}

          {feedback && !modalSection ? (
            <div className={`${styles.feedback} ${feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackError}`} role="status">
              {feedback.message}
              <button onClick={() => setFeedback(null)} aria-label="Tutup notifikasi">×</button>
            </div>
          ) : null}

          {activeSection === "overview" ? (
            <Overview
              data={data}
              pendingBusinesses={pendingBusinesses.length}
              pendingFunding={pendingFunding.length}
              committedTotal={committedTotal}
              completedSales={completedSales}
              dailyOrders={dailyOrders}
              maxDailyOrders={maxDailyOrders}
              linePoints={linePoints}
              period={period}
              setPeriod={setPeriod}
              onNavigate={setActiveSection}
            />
          ) : (
            <section className={styles.dataPanel}>
              <div className={styles.panelToolbar}>
                <div>
                  <h2>{currentTitle.title}</h2>
                  <p>{visibleRecords.length.toLocaleString("id-ID")} data ditampilkan · Maksimal 500 baris per entitas</p>
                </div>
                <div className={styles.toolbarFilters}>
                  <label className={styles.filterSelect}>
                    <span>Status</span>
                    <select value={filterStatus} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilterStatus(event.target.value)}>
                      <option value="all">Semua status</option>
                      <option value="pending">Menunggu</option>
                      <option value="needs_revision">Perlu revisi</option>
                      <option value="approved">Disetujui</option>
                      <option value="confirmed">Dikonfirmasi</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                      <option value="not_shipped">Belum dikirim</option>
                      <option value="in_transit">Dalam pengiriman</option>
                      <option value="delivered">Terkirim</option>
                      <option value="funded">Target tercapai</option>
                    </select>
                  </label>
                </div>
              </div>

              {activeSection === "profiles" && !authAdminAvailable ? (
                <div className={styles.inlineNotice}>
                  <strong>Manajemen akun Auth terbatas.</strong> Tambah dan hapus akun membutuhkan <code>SUPABASE_SECRET_KEY</code> pada environment server. Data profil yang sudah ada tetap dapat ditinjau.
                </div>
              ) : null}

              {activeSection === "commitments" || activeSection === "orders" ? (
                <div className={styles.inlineNotice}>
                  <strong>Catatan penting.</strong> Perubahan komitmen dan pesanan menggunakan fungsi database terkendali agar target pendanaan dan stok tetap konsisten.
                </div>
              ) : null}

              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      {columns[activeSection].map((column) => <th key={column.key}>{column.label}</th>)}
                      {activeSection !== "audit" ? <th className={styles.actionHeader}>Aksi</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record) => (
                      <tr key={record.id}>
                        {columns[activeSection].map((column) => {
                          const display = columnValue(activeSection, record, column.key, data);
                          const isStatus = ["status", "verification_status", "funding_status", "shipping_status", "is_published", "role", "action"].includes(column.key);
                          return (
                            <td key={column.key}>
                              {isStatus ? <span className={`${styles.statusPill} ${statusTone(valueOf(record, column.key))}`}>{display}</span> : (
                                <span className={column.key === "id" || column.key.endsWith("_id") ? styles.mono : ""}>{display}</span>
                              )}
                            </td>
                          );
                        })}
                        {activeSection !== "audit" ? (
                          <td>
                            <div className={styles.rowActions}>
                              {activeSection !== "commitments" && !(activeSection === "profiles" && valueOf(record, "role") === "superadmin") ? (
                                <button className={styles.editButton} onClick={() => openEdit(activeSection as EditableSection, record)}>Edit</button>
                              ) : null}
                              {activeSection === "profiles" && valueOf(record, "role") === "superadmin" ? (
                                <span className={styles.protectedLabel}>Dilindungi</span>
                              ) : (
                                <button className={styles.deleteButton} disabled={isPending} onClick={() => removeRecord(activeSection as EditableSection, record)}>Hapus</button>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {visibleRecords.length === 0 ? (
                      <tr><td colSpan={columns[activeSection].length + (activeSection === "audit" ? 0 : 1)}>
                        <div className={styles.emptyState}>
                          <span>⌕</span>
                          <strong>Belum ada data yang cocok</strong>
                          <p>Ubah kata pencarian atau tambahkan data baru.</p>
                        </div>
                      </td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} MARIVEST · SuperAdmin Console</span>
            <span>Terhubung dengan data operasional MARIVEST</span>
          </footer>
        </div>
      </main>

      {modalSection ? (
        <Modal
          title={modalMode === "user" ? "Tambah pengguna" : modalMode === "edit" ? "Edit data" : "Tambah data"}
          subtitle={modalMode === "user" ? "Buat akun Pelaku Usaha atau Mitra melalui Supabase Auth." : "Perubahan akan divalidasi kembali di server dan database."}
          onClose={closeModal}
        >
          {feedback && modalSection ? (
            <div className={`${styles.feedback} ${feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackError}`} role="alert">
              {feedback.message}
            </div>
          ) : null}
          <form className={styles.formGrid} onSubmit={submitRecord}>
            {modalMode === "user" ? (
              <>
                <FieldInput field={{ key: "full_name", label: "Nama lengkap", type: "text", required: true }} />
                <FieldInput field={{ key: "email", label: "Alamat email", type: "email", required: true }} />
                <FieldInput field={{ key: "password", label: "Kata sandi awal", type: "password", required: true, hint: "Minimal 10 karakter. Berikan kredensial melalui kanal yang aman." }} />
                <FieldInput field={{ key: "role", label: "Jenis akun", type: "select", required: true, options: [{ value: "pelaku_usaha", label: "Pelaku Usaha" }, { value: "mitra", label: "Mitra" }] }} />
              </>
            ) : (
              fieldDefinitions(modalSection, data, modalMode === "edit").map((field) => (
                <FieldInput key={field.key} field={field} record={selectedRecord ?? undefined} />
              ))
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={isPending}>Batal</button>
              <button type="submit" className={styles.primaryButton} disabled={isPending}>
                {isPending ? "Menyimpan..." : modalMode === "edit" ? "Simpan perubahan" : "Simpan data"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isPending ? <div className={styles.savingToast}>Menyimpan perubahan…</div> : null}
    </div>
  );
}

function FieldInput({ field, record }: { field: FieldDefinition; record?: AdminRecord }) {
  const initial = record ? valueOf(record, field.key) : "";
  const value = field.key === "investor_share_percent" && record
    ? String(Math.round(Number(record.investor_share_ratio ?? 0) * 100))
    : initial;

  if (field.type === "textarea") {
    return (
      <label className={styles.formField}>
        <span>{field.label}{field.required ? " *" : ""}</span>
        <textarea name={field.key} defaultValue={value} required={field.required} placeholder={field.placeholder} rows={3} />
        {field.hint ? <small>{field.hint}</small> : null}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className={styles.formField}>
        <span>{field.label}{field.required ? " *" : ""}</span>
        <select name={field.key} defaultValue={value} required={field.required}>
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {field.hint ? <small>{field.hint}</small> : null}
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className={`${styles.formField} ${styles.checkboxField}`}>
        <span>{field.label}</span>
        <input type="checkbox" name={field.key} value="true" defaultChecked={value === "true"} />
        <small>Aktifkan untuk menampilkan data pada katalog sesuai aturan publikasi.</small>
      </label>
    );
  }

  return (
    <label className={styles.formField}>
      <span>{field.label}{field.required ? " *" : ""}</span>
      <input
        name={field.key}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : field.type === "password" ? "password" : field.type === "email" ? "email" : "text"}
        defaultValue={value}
        required={field.required}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step ?? (field.type === "number" ? 1 : undefined)}
      />
      {field.hint ? <small>{field.hint}</small> : null}
    </label>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <div className={styles.modalHeader}>
          <div><h2 id="admin-modal-title">{title}</h2><p>{subtitle}</p></div>
          <button onClick={onClose} aria-label="Tutup dialog">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Overview({
  data,
  pendingBusinesses,
  pendingFunding,
  committedTotal,
  completedSales,
  dailyOrders,
  maxDailyOrders,
  linePoints,
  period,
  setPeriod,
  onNavigate,
}: {
  data: AdminDashboardData;
  pendingBusinesses: number;
  pendingFunding: number;
  committedTotal: number;
  completedSales: number;
  dailyOrders: { label: string; count: number }[];
  maxDailyOrders: number;
  linePoints: string;
  period: string;
  setPeriod: (value: string) => void;
  onNavigate: (section: SectionKey) => void;
}) {
  const fundedCount = data.funding.filter((item) => valueOf(item, "funding_status") === "funded").length;
  const activeProducts = data.products.filter((item) => valueOf(item, "is_published") === "true").length;
  const completedOrders = data.orders.filter((item) => valueOf(item, "status") === "completed").length;
  const distribution = [
    { label: "Menunggu", count: data.orders.filter((item) => valueOf(item, "status") === "pending").length },
    { label: "Diproses", count: data.orders.filter((item) => valueOf(item, "status") === "confirmed").length },
    { label: "Selesai", count: completedOrders },
  ];
  const totalDistribution = Math.max(1, distribution.reduce((sum, item) => sum + item.count, 0));
  const pendingTotal = pendingBusinesses + pendingFunding;

  return (
    <>
      <div className={styles.periodRow}>
        <div><span className={styles.sectionEyebrow}>PERFORMA MARIVEST</span><strong>Ringkasan aktivitas</strong></div>
        <div className={styles.periodSwitch}>
          {["hari", "minggu", "bulan", "tahun"].map((value) => (
            <button key={value} className={period === value ? styles.periodActive : ""} onClick={() => setPeriod(value)}>{value === "hari" ? "Hari ini" : value === "minggu" ? "Minggu" : value === "bulan" ? "Bulan" : "Tahun"}</button>
          ))}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon="♙" label="Total pengguna" value={data.profiles.length.toLocaleString("id-ID")} foot={`${data.profiles.filter((item) => valueOf(item, "role") === "pelaku_usaha").length} Pelaku Usaha · ${data.profiles.filter((item) => valueOf(item, "role") === "mitra").length} Mitra`} tone="blue" />
        <StatCard icon="⌂" label="Profil usaha" value={data.businesses.length.toLocaleString("id-ID")} foot={`${pendingBusinesses} menunggu verifikasi`} tone="green" />
        <StatCard icon="◈" label="Komitmen pendanaan" value={rupiah(committedTotal)} foot={`${fundedCount} proyek mencapai target`} tone="violet" />
        <StatCard icon="▤" label="Pesanan selesai" value={completedOrders.toLocaleString("id-ID")} foot={`${rupiah(completedSales)} nilai penjualan`} tone="orange" />
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.chartCard}>
          <div className={styles.cardHeading}>
            <div><span className={styles.sectionEyebrow}>ANALITIK</span><h2>Aktivitas pesanan</h2><p>Jumlah pesanan yang tercatat selama 7 hari terakhir.</p></div>
            <span className={styles.chartMetric}>{data.orders.length.toLocaleString("id-ID")} total pesanan</span>
          </div>
          <div className={styles.chartLegend}><i /> Jumlah pesanan</div>
          <div className={styles.chartArea}>
            <div className={styles.chartYLabels}><span>{maxDailyOrders}</span><span>{Math.ceil(maxDailyOrders * .66)}</span><span>{Math.ceil(maxDailyOrders * .33)}</span><span>0</span></div>
            <div className={styles.chartCanvas}>
              <div className={styles.chartGridLine} /><div className={styles.chartGridLine} /><div className={styles.chartGridLine} /><div className={styles.chartGridLine} />
              <svg viewBox="0 0 300 110" preserveAspectRatio="none" role="img" aria-label="Grafik pesanan tujuh hari terakhir">
                <defs><linearGradient id="admin-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3478ee" stopOpacity=".28" /><stop offset="100%" stopColor="#3478ee" stopOpacity="0" /></linearGradient></defs>
                <polygon points={`14,100 ${linePoints} 286,100`} fill="url(#admin-chart-fill)" />
                <polyline points={linePoints} fill="none" stroke="#3478ee" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {dailyOrders.map((item, index) => {
                  const x = 14 + (index * 272) / Math.max(1, dailyOrders.length - 1);
                  const y = 92 - (item.count / maxDailyOrders) * 68;
                  return <circle key={item.label} cx={x} cy={y} r="3.4" fill="currentColor" stroke="#3478ee" strokeWidth="2" />;
                })}
              </svg>
              <div className={styles.chartXLabels}>{dailyOrders.map((item) => <span key={item.label}>{item.label}</span>)}</div>
            </div>
          </div>
        </section>

        <section className={styles.fulfillmentCard}>
          <div className={styles.cardHeading}>
            <div><span className={styles.sectionEyebrow}>MARKETPLACE</span><h2>Status pesanan</h2><p>Distribusi pesanan berdasarkan status.</p></div>
            
          </div>
          <div className={styles.donutWrap}>
            <div className={styles.donut} style={{ background: `conic-gradient(#2864e8 0 ${(distribution[0].count / totalDistribution) * 100}%, #12a579 ${(distribution[0].count / totalDistribution) * 100}% ${((distribution[0].count + distribution[1].count) / totalDistribution) * 100}%, #dce3ec ${((distribution[0].count + distribution[1].count) / totalDistribution) * 100}% 100%)` }}>
              <div><strong>{data.orders.length}</strong><span>Total pesanan</span></div>
            </div>
          </div>
          <div className={styles.donutLegend}>
            {distribution.map((item, index) => <div key={item.label}><span className={`${styles.legendDot} ${[styles.dotBlue, styles.dotGreen, styles.dotGray][index]}`} />{item.label}<strong>{item.count}</strong></div>)}
          </div>
          <p className={styles.donutFoot}>Nilai penjualan hanya dihitung setelah pesanan berstatus selesai.</p>
        </section>
      </div>

      <div className={styles.bottomGrid}>
        <section className={styles.actionCard}>
          <div className={styles.cardHeading}>
            <div><span className={styles.sectionEyebrow}>PERLU TINDAKAN</span><h2>Antrean verifikasi</h2><p>Data yang memerlukan pemeriksaan administratif.</p></div>
            <span className={styles.totalQueue}>{pendingTotal}</span>
          </div>
          <button className={styles.queueRow} onClick={() => onNavigate("businesses")}>
            <span className={styles.queueIcon}>⌂</span><span><strong>Profil usaha</strong><small>Menunggu atau perlu revisi</small></span><b>{pendingBusinesses}</b><span className={styles.queueArrow}>→</span>
          </button>
          <button className={styles.queueRow} onClick={() => onNavigate("funding")}>
            <span className={styles.queueIcon}>◈</span><span><strong>Proyek pendanaan</strong><small>Menunggu atau perlu revisi</small></span><b>{pendingFunding}</b><span className={styles.queueArrow}>→</span>
          </button>
        </section>

        <section className={styles.quickCard}>
          <div className={styles.cardHeading}><div><span className={styles.sectionEyebrow}>RINGKASAN MODUL</span><h2>Operasional marketplace</h2><p>Ringkasan katalog dan aktivitas transaksi.</p></div></div>
          <div className={styles.quickStats}>
            <div><span>Produk terdaftar</span><strong>{data.products.length}</strong></div>
            <div><span>Produk dipublikasikan</span><strong>{activeProducts}</strong></div>
            <div><span>Catatan keuangan</span><strong>{data.financial.length}</strong></div>
            <div><span>Proyek pendanaan</span><strong>{data.funding.length}</strong></div>
          </div>
          <button className={styles.textLink} onClick={() => onNavigate("products")}>Kelola marketplace <span>→</span></button>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, foot, tone }: { icon: string; label: string; value: string; foot: string; tone: string }) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statTop}><span className={`${styles.statIcon} ${styles[`tone_${tone}`]}`}>{icon}</span><span className={styles.statTag}>● Live data</span></div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{foot}</small>
      <div className={styles.statSpark}><i /><i /><i /><i /><i /><i /></div>
    </article>
  );
}
