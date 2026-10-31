
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "./types";

export type CurrentProfile = {
  id: string;
  fullName: string;
  role: AppRole;
};

export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();

  const {
    data,
    error: claimsError,
  } = await supabase.auth.getClaims();

  // Pastikan data dan claims tersedia sebelum mengambil user ID.
  const userId = data?.claims?.sub;

  if (claimsError || typeof userId !== "string" || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || !isAppRole(profile.role)) {
    redirect("/login?error=profile");
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  };
}

export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  const profile = await requireProfile();

  if (profile.role !== role) {
    redirect(profile.role === "superadmin" ? "/admin" : "/dashboard");
  }

  return profile;
}
