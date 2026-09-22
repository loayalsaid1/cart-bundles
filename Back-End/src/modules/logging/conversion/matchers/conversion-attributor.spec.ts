import { isWidgetSource } from './conversion-attributor';

describe('isWidgetSource', () => {
  it('returns widget when signal exists and inferred when missing', () => {
    expect(isWidgetSource(true)).toBe('widget');
    expect(isWidgetSource(false)).toBe('inferred');
  });
});
