import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MarivestHome } from "@/components/home/marivest-home";
import { SellerDashboard } from "@/components/seller/seller-dashboard";
import { loadSellerData } from "@/lib/seller/data";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  cartFromRow, commitmentFromRow, fundingFromRow, notificationFromRow,
  orderFromRow, productFromRow,
  type CartRow, type CommitmentRow, type FundingRow, type NotificationRow,
  type OrderRow, type ProductRow,
} from "@/lib/domain/queries";
import type { InvestorStatus } from "@/lib/investor/types";
import type { CartView, CommitmentView, FundingView, NotificationView, OrderView, ProductView } from "@/lib/domain/types";

type DashboardPageProps = { searchParams: Promise<{ tab?: string }> };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await connection();
  const profile = await requireProfile();
  if (profile.role === "superadmin") redirect("/admin");
  if (profile.role === "pelaku_usaha") {
    const seller = await loadSellerData(profile.id);
    const { tab } = await searchParams;
    const initialTab = tab === "shop" || tab === "funding" || tab === "notifications" || tab === "profile" ? tab : "home";
    return <SellerDashboard
      fullName={profile.fullName}
      businesses={seller.businesses}
      products={seller.products}
      projects={seller.projects}
      orders={seller.orders}
      notifications={seller.notifications}
      initialTab={initialTab}
      dataError={seller.errors.length ? "Sebagian data belum dapat dimuat. Periksa migrasi dan RLS Supabase." : null}
    />;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const isMitra = profile.role === "mitra";
  const requests = await Promise.all([
    supabase.from("products")
      .select("id,name,category,description,price,unit,stock,image_url,business_profiles(name,city)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100),
    isMitra
      ? supabase.from("investor_registrations").select("status").eq("user_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    isMitra
      ? supabase.from("cart_items")
          .select("id,product_id,quantity,products(id,name,category,description,price,unit,stock,image_url,business_profiles(name,city))")
          .eq("buyer_id", profile.id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    isMitra
      ? supabase.from("orders")
          .select("id,quantity,total_amount,status,shipping_status,checkout_id,created_at,products(name,unit)")
          .eq("buyer_id", profile.id).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    isMitra
      ? supabase.from("notifications")
          .select("id,title,body,is_read,created_at")
          .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const [productsResult, investorResult, cartResult, ordersResult, notificationsResult] = requests;
  const investorStatus: InvestorStatus = investorResult.data?.status === "active"
    ? "active" : investorResult.data?.status === "revoked" ? "revoked" : "not_registered";

  const errors = [productsResult.error, investorResult.error, cartResult.error, ordersResult.error, notificationsResult.error]
    .filter((value) => value !== null);

  let funding: FundingView[] = [];
  let commitments: CommitmentView[] = [];
  if (isMitra && investorStatus === "active") {
    const [fundingResult, commitmentsResult] = await Promise.all([
      supabase.rpc("list_funding_opportunities"),
      supabase.from("funding_commitments").select("id,project_id,amount,created_at")
        .eq("investor_id", profile.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (fundingResult.error) errors.push(fundingResult.error);
    if (commitmentsResult.error) errors.push(commitmentsResult.error);
    funding = ((fundingResult.data ?? []) as unknown as FundingRow[]).map(fundingFromRow);
    commitments = ((commitmentsResult.data ?? []) as unknown as CommitmentRow[]).map(commitmentFromRow);
  }

  const products: ProductView[] = ((productsResult.data ?? []) as unknown as ProductRow[]).map(productFromRow);
  const cart: CartView[] = ((cartResult.data ?? []) as unknown as CartRow[])
    .filter((row) => row.products !== null)
    .map(cartFromRow);
  const orders: OrderView[] = ((ordersResult.data ?? []) as unknown as OrderRow[]).map(orderFromRow);
  const notifications: NotificationView[] = ((notificationsResult.data ?? []) as unknown as NotificationRow[]).map(notificationFromRow);
  const { tab } = await searchParams;
  const initialTab = tab === "investor" && isMitra ? "investor" : tab === "profile" ? "profile" : tab === "marketplace" ? "marketplace" : tab === "notifications" ? "notifications" : "home";

  return (
    <MarivestHome
      fullName={profile.fullName}
      email={authData.user?.email ?? ""}
      role={profile.role}
      investorStatus={investorStatus}
      products={products}
      cart={cart}
      orders={orders}
      notifications={notifications}
      projects={funding}
      commitments={commitments}
      initialTab={initialTab}
      dataError={errors.length ? "Sebagian data belum dapat dimuat. Pastikan migration Supabase sudah diterapkan." : null}
    />
  );
}
