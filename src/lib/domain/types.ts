export type ProductView = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  image: string;
  seller: string;
  location: string;
};

export type CartView = {
  id: string;
  productId: string;
  quantity: number;
  product: ProductView;
};

export type OrderView = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  date: string;
  shippingStatus?: ShippingStatus;
  checkoutId?: string | null;
};

export type FundingView = {
  id: string;
  title: string;
  business: string;
  category: string;
  description: string;
  purpose: string;
  location: string;
  image: string;
  target: number;
  raised: number;
  fundingStatus: "open" | "funded";
  investorShareRatio: number;
};

export type CommitmentView = {
  id: string;
  projectId: string;
  amount: number;
  createdAt: string;
};

export type NotificationView = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type ActionResult = { status: "success" | "error"; message: string };

// The checkout is a recorded payment simulation, never an actual charge.
export type PaymentMethod = "qris" | "bank_transfer" | "ovo" | "dana" | "shopeepay" | "credit_card";
export type ShippingStatus = "not_shipped" | "in_transit" | "delivered";
export type CheckoutView = {
  id: string;
  subtotal: number;
  shippingFee: number;
  handlingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  recipientName: string;
  shippingAddress: string;
  createdAt: string;
};
export type SellerProductView = ProductView & { revenue: number; isPublished: boolean };
export type SellerFundingView = {
  id: string;
  image: string | null;
  title: string;
  target: number;
  raised: number;
  verificationStatus: string;
  fundingStatus: string;
};
export type SellerOrderView = OrderView & {
  shippingStatus: ShippingStatus;
  productId: string;
  buyerId: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: string;
};
