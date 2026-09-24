import { mapStoreInfo } from './merchant-profile.mapper';

describe('mapStoreInfo', () => {
  it('maps name, email, domain, and avatar', () => {
    expect(
      mapStoreInfo({
        success: true,
        data: {
          id: 1,
          name: 'Acme Store',
          email: 'store@acme.test',
          domain: 'https://salla.sa/acme',
          avatar: 'https://cdn.salla.sa/acme.png',
        },
      }),
    ).toEqual({
      storeName: 'Acme Store',
      storeEmail: 'store@acme.test',
      storeDomain: 'https://salla.sa/acme',
      avatar: 'https://cdn.salla.sa/acme.png',
    });
  });

  it('maps missing or blank fields to null', () => {
    expect(mapStoreInfo({})).toEqual({
      storeName: null,
      storeEmail: null,
      storeDomain: null,
      avatar: null,
    });
    expect(
      mapStoreInfo({
        data: { name: '  ', email: '', domain: undefined, avatar: ' ' },
      }),
    ).toEqual({
      storeName: null,
      storeEmail: null,
      storeDomain: null,
      avatar: null,
    });
  });
});
