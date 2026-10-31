import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireProfile } from "@/lib/auth/profile";
import { loadSellerData } from "@/lib/seller/data";
import { SellerOrders } from "@/components/seller/seller-orders";

export default function SellerOrdersPage() {
  return (
    <Suspense fallback={<main aria-live="polite">Memuat pesanan toko...</main>}>
      <SellerOrdersContent />
    </Suspense>
  );
}

async function SellerOrdersContent() {
  await connection();

  const profile = await requireProfile();
  if (profile.role !== "pelaku_usaha") redirect("/dashboard");

  const data = await loadSellerData(profile.id);
  return (
    <SellerOrders
      orders={data.orders}
      error={data.errors.length ? "Sebagian pesanan belum dapat dimuat." : null}
    />
  );
}
