import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MarivestHome } from "@/components/home/marivest-home";
import { requireProfile } from "@/lib/auth/profile";

export default async function DashboardPage() {
  await connection();

  const profile = await requireProfile();

  if (profile.role === "superadmin") {
    redirect("/admin");
  }

  return <MarivestHome fullName={profile.fullName} role={profile.role} />;
}
