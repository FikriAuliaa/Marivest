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
