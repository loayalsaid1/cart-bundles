import { redactJson, redactValue } from './redact';

describe('redactValue', () => {
  it('redacts token fields and keeps the rest', () => {
    const result = redactValue({
      event: 'app.store.authorize',
      merchant: 12,
      data: {
        access_token: 'secret-token',
        refresh_token: 'refresh-secret',
        expires: 123,
      },
    });

    expect(result).toEqual({
      event: 'app.store.authorize',
      merchant: 12,
      data: {
        access_token: '[redacted]',
        refresh_token: '[redacted]',
        expires: 123,
      },
    });
  });
});

describe('redactJson', () => {
  it('wraps non-objects', () => {
    expect(redactJson('plain')).toEqual({ value: 'plain' });
  });
});
