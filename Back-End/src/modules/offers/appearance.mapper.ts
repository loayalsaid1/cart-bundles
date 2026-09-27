import type { OfferAppearanceDto } from './dto/common-offer.dto';

export function appearanceValues(dto?: OfferAppearanceDto) {
  return {
    borderRadiusPx: dto?.borderRadiusPx ?? 0,
    colors: dto?.colors ?? {},
    titleAlign: dto?.titleAlign ?? 'start',
    showBorder: dto?.showBorder ?? true,
    shadow: dto?.shadow ?? 'sm',
  };
}
