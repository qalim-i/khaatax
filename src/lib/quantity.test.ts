import { parseQuantity } from './quantity';

describe('parseQuantity', () => {
  it('reads plain whole numbers', () => {
    expect(parseQuantity('0')).toBe(0);
    expect(parseQuantity('7')).toBe(7);
    expect(parseQuantity('120')).toBe(120);
    expect(parseQuantity('  12  ')).toBe(12);
  });

  it('treats an empty field as zero', () => {
    expect(parseQuantity('')).toBe(0);
    expect(parseQuantity('   ')).toBe(0);
  });

  it('rejects negatives', () => {
    // The regression that mattered: `parseInt('-5', 10) || 0` returned -5, which
    // ran the transaction RPC backwards.
    expect(parseQuantity('-5')).toBeNull();
    expect(parseQuantity('-0')).toBeNull();
  });

  it('rejects anything that is not a whole count', () => {
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('1.5')).toBeNull();
    expect(parseQuantity('1e3')).toBeNull();
    expect(parseQuantity('+3')).toBeNull();
    expect(parseQuantity('1 2')).toBeNull();
    expect(parseQuantity('٣')).toBeNull();
  });

  it('rejects values too large to be a safe integer', () => {
    expect(parseQuantity('99999999999999999999')).toBeNull();
  });
});
