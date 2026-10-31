import { createClient } from "@/lib/supabase/server";
import { productFromRow, type ProductRow } from "@/lib/domain/queries";
import type { SellerFundingView, SellerOrderView, SellerProductView, NotificationView } from "@/lib/domain/types";
import { mergeStoreHistories, storeRevenueFromRow, type StoreRevenueRow } from "@/lib/domain/store-revenue";

type BusinessRow = { id: string; name: string; verification_status: string };
type OrderRow = {
  id: string; product_id: string; buyer_id: string; quantity: number;
  total_amount: number; status: SellerOrderView["status"];
  shipping_status: SellerOrderView["shippingStatus"]; created_at: string;
  product_name: string; product_unit: string;
  recipient_name: string; shipping_phone: string;
  shipping_address: string; payment_method: string;
};
type FundingRow = { id: string; title: string; image_url: string | null; target_amount: number;
  verification_status: string; funding_status: string };

export async function loadSellerData(userId: string) {
  const supabase = await createClient();
  const { data: rawBusinesses, error: businessError } = await supabase.from("business_profiles")
    .select("id,name,verification_status").eq("owner_id",userId).order("created_at",{ ascending: true });
  const businesses = (rawBusinesses ?? []) as BusinessRow[];
  const businessIds = businesses.map((b) => b.id);
  if (businessError) throw new Error("Profil usaha belum dapat dimuat.");

  const [productResult, fundingResult, notificationsResult] = await Promise.all([
    businessIds.length ? supabase.from("products").select("id,name,category,description,price,unit,stock,image_url,is_published,business_profiles(name,city)")
      .in("business_id",businessIds).order("created_at",{ascending:false}) : Promise.resolve({data:[],error:null}),
    businessIds.length ? supabase.from("funding_projects")
      .select("id,title,image_url,target_amount,verification_status,funding_status")
      .in("business_id",businessIds).order("created_at",{ascending:false}) : Promise.resolve({data:[],error:null}),
    supabase.from("notifications").select("id,title,body,is_read,created_at")
      .eq("user_id",userId).order("created_at",{ascending:false}).limit(30),
  ]);

  const historyResults = await Promise.all(businessIds.map((id) =>
    supabase.rpc("business_marketplace_history", { p_business_id: id })
  ));
  const storeHistory = mergeStoreHistories(historyResults.map((result) =>
    ((result.data ?? []) as StoreRevenueRow[]).map(storeRevenueFromRow)
  ));

  const productRows = (productResult.data ?? []) as unknown as (ProductRow & {is_published:boolean})[];
  const productIds = productRows.map((r) => r.id);
  const projectRows = (fundingResult.data ?? []) as FundingRow[];
  const projectIds = projectRows.map((r) => r.id);
  const [ordersResult, commitmentResult, revenueResult] = await Promise.all([
    productIds.length ? supabase.rpc("list_seller_orders")
      : Promise.resolve({data:[],error:null}),
    projectIds.length ? supabase.from("funding_commitments").select("project_id,amount").in("project_id",projectIds)
      : Promise.resolve({data:[],error:null}),
    productIds.length ? supabase.rpc("seller_product_revenue") : Promise.resolve({data:[],error:null}),
  ]);
  const orderRows = (ordersResult.data ?? []) as unknown as OrderRow[];
  const verifiedRevenues = new Map<string,number>();
  for (const record of (revenueResult.data ?? []) as {product_id:string;confirmed_total:number}[]) {
    verifiedRevenues.set(record.product_id, Number(record.confirmed_total));
  }
  const products: SellerProductView[] = productRows.map((row) => ({
    ...productFromRow(row), isPublished: row.is_published, revenue: verifiedRevenues.get(row.id) ?? 0,
  })).sort((a,b) => b.revenue-a.revenue);
  const totalFunded = new Map<string, number>();
  for (const c of (commitmentResult.data ?? []) as {project_id:string;amount:number}[]) {
    totalFunded.set(c.project_id,(totalFunded.get(c.project_id) ?? 0)+Number(c.amount));
  }
  const projects: SellerFundingView[] = projectRows.map((p) => ({
    id:p.id,title:p.title,image:p.image_url,target:Number(p.target_amount),raised:totalFunded.get(p.id) ?? 0,
    verificationStatus:p.verification_status,fundingStatus:p.funding_status,
  })).sort((a,b)=>b.raised-a.raised);
  const orders: SellerOrderView[] = orderRows.map((row)=>({
    id:row.id, productId:row.product_id,buyerId:row.buyer_id,
    productName:row.product_name,unit:row.product_unit,
    quantity:row.quantity,total:Number(row.total_amount),status:row.status,date:row.created_at,
    shippingStatus:row.shipping_status, recipientName:row.recipient_name,
    recipientPhone:row.shipping_phone,
    shippingAddress:row.shipping_address,
    paymentMethod:row.payment_method,
  }));
  const notifications: NotificationView[] = (notificationsResult.data ?? []).map((n)=>({
    id:n.id,title:n.title,body:n.body,isRead:n.is_read,createdAt:n.created_at,
  }));
  const errors = [productResult.error,fundingResult.error,notificationsResult.error,ordersResult.error,commitmentResult.error,revenueResult.error,...historyResults.map((r)=>r.error)]
    .filter(Boolean).map((err)=>err?.message);
  return { businesses,products,projects,orders,notifications,storeHistory,errors };
}
