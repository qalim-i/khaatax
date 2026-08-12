import { parseAmount } from '@/lib/money';

describe('parseAmount', () => {
  it('reads whole rupees', () => {
    expect(parseAmount('1250')).toBe(1250);
    expect(parseAmount('0')).toBe(0);
  });

  it('reads paise, to two places', () => {
    expect(parseAmount('1250.5')).toBe(1250.5);
    expect(parseAmount('1250.55')).toBe(1250.55);
  });

  it('treats an empty field as zero', () => {
    // A return-only transaction genuinely charges nothing.
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('   ')).toBe(0);
  });

  it('accepts thousands separators', () => {
    expect(parseAmount('1,25,000')).toBe(125000);
  });

  it('rejects a negative amount', () => {
    // The number-pad on Android offers a minus sign, so this is reachable.
    expect(parseAmount('-500')).toBeNull();
  });

  it('rejects more than two decimal places', () => {
    expect(parseAmount('10.555')).toBeNull();
  });

  it('rejects text, exponents and stray punctuation', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('1e5')).toBeNull();
    expect(parseAmount('Infinity')).toBeNull();
    expect(parseAmount('10.')).toBeNull();
    expect(parseAmount('.5')).toBeNull();
    expect(parseAmount('1 000')).toBeNull();
  });

  it('rejects a figure too large for the column', () => {
    expect(parseAmount('99999999999')).toBeNull();
  });
});
