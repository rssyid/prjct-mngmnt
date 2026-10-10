import Decimal from 'decimal.js';

export { Decimal };

export function toDecimal(val: Decimal.Value | null | undefined): Decimal {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0);
  }
  return new Decimal(val);
}

export function toDecimalString(val: Decimal.Value | null | undefined, precision = 2): string {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0).toFixed(precision);
  }
  return new Decimal(val).toFixed(precision);
}
