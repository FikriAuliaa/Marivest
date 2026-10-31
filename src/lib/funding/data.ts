import { createClient } from "@/lib/supabase/server";
import { storeRevenueFromRow, type StoreRevenueRow } from "@/lib/domain/store-revenue";

export type FundingProjectDetail = {
  id: string;
  business_id: string;
  title: string;
  category: string;
  purpose: string;
  description: string;
  image_url: string | null;
  target_amount: number;
  investor_share_ratio: number;
  verification_status: "pending" | "needs_revision" | "approved";
  funding_status: "open" | "funded";
  term_months: number | null;
  risk_summary: string | null;
  created_at: string;
  business_profiles: { owner_id: string; name: string; city: string; category: string; description: string; verification_status: string } | null;
};

export type FinancialSnapshot = {
  total_committed: number;
  investor_count: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
  investor_pool: number;
  allocated_to_investors: number;
  seller_share: number;
  rounding_to_seller: number;
  my_commitment: number;
  my_profit_share: number;
};
export type FundingPeriod = { period_month: string; revenue: number; cost: number; net: number };
export type FundingReview = { id: string; decision: string; note: string; reviewed_at: string };
export type FundingEntry = { id: string; type: "revenue" | "cost"; amount: number; period: string; note: string; created_at: string };

export async function loadFundingProject(projectId: string) {
  const supabase = await createClient();
  const { data: rawProject, error: projectError } = await supabase.from("funding_projects")
    .select("id,business_id,title,category,purpose,description,image_url,target_amount,investor_share_ratio,verification_status,funding_status,term_months,risk_summary,created_at,business_profiles(owner_id,name,city,category,description,verification_status)")
    .eq("id",projectId).maybeSingle();
  if (projectError || !rawProject) return null;
  const project = rawProject as unknown as FundingProjectDetail;
  const [snapshotResult, periodResult, reviewResult, entryResult, storeHistoryResult] = await Promise.all([
    supabase.rpc("funding_financial_snapshot",{p_project_id:projectId}),
    supabase.rpc("funding_period_history",{p_project_id:projectId}),
    supabase.from("funding_project_reviews").select("id,decision,note,reviewed_at").eq("project_id",projectId).order("reviewed_at",{ascending:false}).limit(8),
    supabase.from("financial_entries").select("id,type,amount,period,note,created_at")
      .eq("project_id",projectId).order("created_at",{ascending:false}).limit(100),
    supabase.rpc("business_marketplace_history", { p_business_id: project.business_id }),
  ]);
  const first = Array.isArray(snapshotResult.data) ? snapshotResult.data[0] : snapshotResult.data;
  const snapshot = first as FinancialSnapshot | null;
  if (snapshotResult.error || !snapshot || periodResult.error || storeHistoryResult.error) throw new Error("Ringkasan pendanaan tidak dapat dimuat. Terapkan migration pendanaan.");
  return {
    project,
    snapshot,
    periods: (periodResult.data ?? []) as FundingPeriod[],
    reviews: (reviewResult.data ?? []) as FundingReview[],
    entries: (entryResult.data ?? []) as FundingEntry[],
    storeHistory: ((storeHistoryResult.data ?? []) as StoreRevenueRow[]).map(storeRevenueFromRow),
  };
}
