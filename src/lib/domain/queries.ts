import type { CartView, CommitmentView, FundingView, NotificationView, OrderView, ProductView } from "./types";

const fallback = "/images/pon.jpg";

function imageOrFallback(value: string | null | undefined): string {
  if (typeof value !== "string") return fallback;
  if (value.startsWith("/images/")) return value;
  // Only HTTPS URLs may be stored for public product imagery.
  if (value.startsWith("https://")) return value;
  return fallback;
}

type BusinessJoin = { name: string; city: string } | null;
type ProductRow = {
  id: string; name: string; category: string; description: string;
  price: number; unit: string; stock: number; image_url: string | null;
  business_profiles: BusinessJoin;
};

export function productFromRow(row: ProductRow): ProductView {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: Number(row.price),
    unit: row.unit,
    stock: row.stock,
    image: imageOrFallback(row.image_url),
    seller: row.business_profiles?.name ?? "Pelaku usaha maritim",
    location: row.business_profiles?.city ?? "Indonesia",
  };
}

export type { ProductRow };

export type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  products: ProductRow;
};
export function cartFromRow(row: CartRow): CartView {
  return { id: row.id, productId: row.product_id, quantity: row.quantity, product: productFromRow(row.products) };
}

export type OrderRow = {
  id: string; quantity: number; total_amount: number; status: OrderView["status"];
  created_at: string; products: { name: string; unit: string } | null;
};
export function orderFromRow(row: OrderRow): OrderView {
  return {
    id: row.id,
    quantity: row.quantity,
    total: Number(row.total_amount),
    status: row.status,
    date: row.created_at,
    productName: row.products?.name ?? "Produk perikanan",
    unit: row.products?.unit ?? "kg",
  };
}

type FundingRow = {
  id: string; title: string; category: string; purpose: string; description: string;
  image_url: string | null; business_name: string; city: string;
  target_amount: number; raised_amount: number; funding_status: "open" | "funded";
  investor_share_ratio: number;
};
export function fundingFromRow(row: FundingRow): FundingView {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    purpose: row.purpose,
    description: row.description,
    image: imageOrFallback(row.image_url),
    business: row.business_name,
    location: row.city,
    target: Number(row.target_amount),
    raised: Number(row.raised_amount),
    fundingStatus: row.funding_status,
    investorShareRatio: Number(row.investor_share_ratio),
  };
}
export type { FundingRow };

export type CommitmentRow = { id: string; project_id: string; amount: number; created_at: string };
export function commitmentFromRow(row: CommitmentRow): CommitmentView {
  return { id: row.id, projectId: row.project_id, amount: Number(row.amount), createdAt: row.created_at };
}

export type NotificationRow = { id: string; title: string; body: string; is_read: boolean; created_at: string };
export function notificationFromRow(row: NotificationRow): NotificationView {
  return { id: row.id, title: row.title, body: row.body, isRead: row.is_read, createdAt: row.created_at };
}
