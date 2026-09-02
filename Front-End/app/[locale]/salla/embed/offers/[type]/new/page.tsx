import { notFound } from "next/navigation";
import { slugToKind } from "@/lib/utils/offer-kind";
import { OfferBuilderByType } from "@/components/offers/builder/offer-builder-by-type";

export default async function NewOfferTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const kind = slugToKind(type);
  if (!kind) notFound();
  return <OfferBuilderByType kind={kind} />;
}
