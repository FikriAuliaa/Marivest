import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { AddProduct } from "@/components/seller/add-product";

export default function AddProductPage() {
  return (
    <Suspense fallback={<main aria-live="polite">Memuat form produk...</main>}>
      <AddProductContent />
    </Suspense>
  );
}

async function AddProductContent() {
  await connection();

  const profile = await requireProfile();
  if (profile.role !== "pelaku_usaha") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("business_profiles")
    .select("id,name,verification_status")
    .eq("owner_id", profile.id)
    .eq("verification_status", "approved");

  return <AddProduct businesses={(data ?? []) as { id: string; name: string }[]} />;
}
