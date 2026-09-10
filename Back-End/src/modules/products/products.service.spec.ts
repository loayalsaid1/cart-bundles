import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService.getCoupons', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps Salla coupon payload to id, code, type, amount, status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 55,
              code: 'UPGRADE10',
              type: 'percentage',
              amount: 10,
              status: 'active',
              extra: 'drop-me',
            },
          ],
        }),
    });

    const service = new ProductsService({
      getOrSet: async (_key: string, _ttl: number, factory: () => Promise<unknown>) =>
        factory(),
    } as never);
    const coupons = await service.getCoupons('token', 'UPG');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.salla.dev/admin/v2/coupons?keyword=UPG',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token' },
      }),
    );
    expect(coupons).toEqual([
      {
        id: 55,
        code: 'UPGRADE10',
        type: 'percentage',
        amount: 10,
        status: 'active',
      },
    ]);
  });

  it('omits keyword query when none is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const service = new ProductsService({
      getOrSet: async (_key: string, _ttl: number, factory: () => Promise<unknown>) =>
        factory(),
    } as never);
    await service.getCoupons('token');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.salla.dev/admin/v2/coupons',
      expect.any(Object),
    );
  });

  it('throws BadRequestException when Salla fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const service = new ProductsService({
      getOrSet: async (_key: string, _ttl: number, factory: () => Promise<unknown>) =>
        factory(),
    } as never);
    await expect(service.getCoupons('token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
