import {
  categoriesCacheKey,
  couponsCacheKey,
  merchantCatalogPrefixes,
  productsCacheKey,
  storefrontOffersCacheKey,
} from './redis.constants';

describe('cache keys', () => {
  it('normalizes empty keywords', () => {
    expect(productsCacheKey(9)).toBe('salla:products:9:_');
    expect(categoriesCacheKey(9, '  Bags ')).toBe('salla:categories:9:bags');
    expect(couponsCacheKey(9, '')).toBe('salla:coupons:9:_');
  });

  it('sorts category ids for storefront keys', () => {
    expect(storefrontOffersCacheKey(3, 11, [20, 4])).toBe(
      'offers:storefront:3:11:4,20',
    );
  });

  it('catalog prefixes match product/category/coupon keys only', () => {
    const prefixes = merchantCatalogPrefixes(9);
    expect(prefixes).toEqual([
      'salla:products:9:',
      'salla:categories:9:',
      'salla:coupons:9:',
    ]);
    expect(productsCacheKey(9).startsWith(prefixes[0])).toBe(true);
    expect(categoriesCacheKey(9, 'bags').startsWith(prefixes[1])).toBe(true);
    expect(couponsCacheKey(9).startsWith(prefixes[2])).toBe(true);
    expect(productsCacheKey(90).startsWith(prefixes[0])).toBe(false);
  });
});
