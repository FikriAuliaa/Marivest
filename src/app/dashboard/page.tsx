import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MarivestHome } from "@/components/home/marivest-home";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { InvestorStatus } from "@/lib/investor/types";

export default async function DashboardPage() {
  await connection();

  const profile = await requireProfile();

  if (profile.role === "superadmin") {
    redirect("/admin");
  }

  let investorStatus: InvestorStatus = "not_registered";

  if (profile.role === "mitra") {
    const supabase = await createClient();
    const { data: registration, error } = await supabase
      .from("investor_registrations")
      .select("status")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        "Gagal memuat status Investor. Pastikan migration investor_registrations sudah diterapkan.",
      );
    }

    if (registration?.status === "active") {
      investorStatus = "active";
    } else if (registration?.status === "revoked") {
      investorStatus = "revoked";
    }
  }

  return (
    <MarivestHome
      fullName={profile.fullName}
      role={profile.role}
      investorStatus={investorStatus}
    />
  );
}
