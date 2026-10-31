import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { cartFromRow, type CartRow } from "@/lib/domain/queries";
import { CheckoutScreen } from "@/components/checkout/checkout-screen";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main aria-live="polite">Memuat checkout...</main>}>
      <CheckoutContent />
    </Suspense>
  );
}

async function CheckoutContent() {
  await connection();

  const profile = await requireProfile();
  if (profile.role !== "mitra") redirect("/dashboard");

  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("cart_items")
    .select(
      "id,product_id,quantity,products(id,name,category,description,price,unit,stock,image_url,business_profiles(name,city))",
    )
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: true });

  const cart = ((entries ?? []) as unknown as CartRow[])
    .filter((row) => row.products !== null)
    .map(cartFromRow);

  return (
    <CheckoutScreen
      name={profile.fullName}
      cart={cart}
      dataError={error ? "Keranjang belum dapat dibaca. Silakan coba kembali." : null}
    />
  );
}
