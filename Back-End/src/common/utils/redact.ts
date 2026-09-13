const SENSITIVE_KEY =
  /(access_token|refresh_token|token|secret|password|authorization|client_secret)/i;

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactValue(nested);
    }
    return output;
  }
  return value;
}

export function redactJson(value: unknown): Record<string, unknown> {
  const redacted = redactValue(value);
  if (redacted && typeof redacted === 'object' && !Array.isArray(redacted)) {
    return redacted as Record<string, unknown>;
  }
  return { value: redacted };
}
