import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { CheckoutSuccess } from "@/components/checkout/checkout-success";

type SuccessProps = {
  searchParams: Promise<{ order?: string }>;
};

export default function CheckoutSuccessPage(props: SuccessProps) {
  return (
    <Suspense fallback={<main aria-live="polite">Memuat status pesanan...</main>}>
      <CheckoutSuccessContent {...props} />
    </Suspense>
  );
}

async function CheckoutSuccessContent({ searchParams }: SuccessProps) {
  await connection();

  const profile = await requireProfile();
  if (profile.role !== "mitra") redirect("/dashboard");

  const { order } = await searchParams;
  if (!order || !/^[0-9a-f-]{36}$/i.test(order)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: checkout, error }, { data: lines }] = await Promise.all([
    supabase
      .from("checkout_sessions")
      .select("id,payment_method,subtotal,shipping_fee,handling_fee,total_amount")
      .eq("id", order)
      .eq("buyer_id", profile.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id,status,shipping_status")
      .eq("checkout_id", order)
      .eq("buyer_id", profile.id),
  ]);

  if (error || !checkout) redirect("/dashboard");

  const statuses = (lines ?? []) as { status: string; shipping_status: string }[];
  const verified = statuses.length > 0 && statuses.every((line) => line.status !== "pending");
  const cancelled = statuses.some((line) => line.status === "cancelled");
  const shipping = statuses.some((line) => line.shipping_status === "in_transit");
  const completed = statuses.length > 0 && statuses.every((line) => line.status === "completed");

  return (
    <CheckoutSuccess
      orderId={order}
      total={Number(checkout.total_amount)}
      paymentMethod={checkout.payment_method}
      status={
        completed
          ? "completed"
          : cancelled
            ? "mixed"
            : shipping
              ? "shipped"
              : verified
                ? "verified"
                : "pending"
      }
    />
  );
}
