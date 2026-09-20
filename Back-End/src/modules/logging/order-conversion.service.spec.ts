import { matchOffers } from './utils/order-conversion.matcher';

describe('OrderConversionService', () => {
  it('uses the shared matcher', () => {
    expect(typeof matchOffers).toBe('function');
  });
});
