export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type OrderActor = "seller" | "buyer" | "admin";

export function canTransition(from: OrderStatus, to: OrderStatus, actorRole: OrderActor): boolean {
  if (actorRole !== "seller") return false;
  return (from === "pending" && (to === "confirmed" || to === "cancelled"))
    || (from === "confirmed" && (to === "completed" || to === "cancelled"));
}

export function orderTotal(price: number, quantity: number): number {
  if (!Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("Harga dan jumlah harus bilangan bulat positif.");
  }
  const value = price * quantity;
  if (!Number.isSafeInteger(value)) throw new Error("Nilai transaksi terlalu besar.");
  return value;
}
