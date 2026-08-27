import { notFound } from "next/navigation";
import { QuantityOfferBuilder } from "@/components/offers/builder/quantity-offer-builder";

export default async function NewOfferTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type !== "quantity") notFound();
  return <QuantityOfferBuilder />;
}
