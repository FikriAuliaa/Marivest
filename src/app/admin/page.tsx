import { connection } from "next/server";
import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { signOutAction } from "@/app/actions/auth";
import { AdminDashboard, type AdminDashboardData, type AdminRecord } from "@/components/admin/admin-dashboard";

export const instant = false;

function records(value: unknown): AdminRecord[] {
  return Array.isArray(value) ? value as AdminRecord[] : [];
}

export default async function AdminPage() {
  await connection();
  const profile = await requireRole("superadmin");
  const supabase = await createClient();

  const [
    profilesResult,
    businessesResult,
    fundingResult,
    commitmentsResult,
    productsResult,
    ordersResult,
    financialResult,
    auditResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").limit(500),
    supabase.from("business_profiles").select("*").limit(500),
    supabase.from("funding_projects").select("*").limit(500),
    supabase.from("funding_commitments").select("*").limit(500),
    supabase.from("products").select("*").limit(500),
    supabase.from("orders").select("*").limit(500),
    supabase.from("financial_entries").select("*").limit(500),
    supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(30),
  ]);

  const adminClient = createAdminSupabaseClient();
  let emailByUserId: Record<string, string> = {};
  let authAdminAvailable = Boolean(adminClient);

  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (!error) {
      emailByUserId = Object.fromEntries(
        data.users.map((user: { id: string; email?: string }) => [user.id, user.email ?? ""]),
      );
    } else {
      authAdminAvailable = false;
    }
  }

  const profileRows = records(profilesResult.data).map((row) => ({
    ...row,
    email: emailByUserId[String(row.id)] ?? "",
  }));

  const data: AdminDashboardData = {
    profiles: profileRows,
    businesses: records(businessesResult.data),
    funding: records(fundingResult.data),
    commitments: records(commitmentsResult.data),
    products: records(productsResult.data),
    orders: records(ordersResult.data),
    financial: records(financialResult.data),
    audit: records(auditResult.data),
  };

  const errors = [
    profilesResult.error,
    businessesResult.error,
    fundingResult.error,
    commitmentsResult.error,
    productsResult.error,
    ordersResult.error,
    financialResult.error,
    auditResult.error,
  ].filter(Boolean).map((error) => error?.message ?? "Data tidak dapat dimuat.");

  return (
    <AdminDashboard
      profileName={profile.fullName}
      data={data}
      dataErrors={errors}
      authAdminAvailable={authAdminAvailable}
      signOutAction={signOutAction}
    />
  );
}
