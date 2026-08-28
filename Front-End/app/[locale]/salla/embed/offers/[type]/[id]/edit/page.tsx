import { notFound } from "next/navigation";
import { QuantityOfferBuilder } from "@/components/offers/builder/quantity-offer-builder";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "quantity_discount") notFound();
  const offerId = Number(id);
  if (!Number.isInteger(offerId)) notFound();
  return <QuantityOfferBuilder offerId={offerId} />;
}
