export function parseAmount(
  value: string | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function tierTotalPrice(
  price: number,
  quantity: number,
  discountType: "percentage" | "fixed",
  discountAmount: number,
  round = false,
): number {
  const subtotal = price * quantity;
  const discounted =
    discountType === "percentage"
      ? subtotal * (1 - discountAmount / 100)
      : subtotal - discountAmount;
  const clamped = Math.max(0, discounted);
  return round ? Math.round(clamped) : clamped;
}

export function tierUnitPrice(
  price: number,
  quantity: number,
  discountType: "percentage" | "fixed",
  discountAmount: number,
  round = false,
): number {
  const total = tierTotalPrice(price, quantity, discountType, discountAmount);
  return round ? Math.round(total / quantity) : total / quantity;
}
