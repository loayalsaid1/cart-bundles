import { notFound } from "next/navigation";
import { slugToKind } from "@/lib/utils/offer-kind";
import { OfferBuilderByType } from "@/components/offers/builder/offer-builder-by-type";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  const kind = slugToKind(type);
  if (!kind) notFound();
  const offerId = Number(id);
  if (!Number.isInteger(offerId)) notFound();
  return <OfferBuilderByType kind={kind} offerId={offerId} />;
}
