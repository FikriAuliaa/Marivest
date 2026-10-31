// Business logic only. Values mirror the versioned checkout_cart RPC migration.
export const SIMULATED_SHIPPING_FEE = 15_000;
export const SIMULATED_HANDLING_FEE = 10_000;

type CheckoutLine = { price: number; quantity: number };
export function checkoutSummary(lines: CheckoutLine[]) {
  if (lines.length === 0) throw new Error("Keranjang kosong.");
  let subtotal = 0;
  for (const item of lines) {
    if (!Number.isSafeInteger(item.price) || item.price < 1 ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Harga atau jumlah produk tidak valid.");
    }
    const lineTotal = item.price * item.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) {
      throw new Error("Total pesanan terlalu besar.");
    }
    subtotal += lineTotal;
  }
  const total = subtotal + SIMULATED_SHIPPING_FEE + SIMULATED_HANDLING_FEE;
  if (!Number.isSafeInteger(total)) throw new Error("Total pesanan terlalu besar.");
  return { subtotal, shippingFee: SIMULATED_SHIPPING_FEE, handlingFee: SIMULATED_HANDLING_FEE, total };
}
