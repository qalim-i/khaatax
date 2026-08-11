// The fixed expense category list from docs/MOBILE_APP_SPEC.md Section 7.
// Defined once here and imported by every screen — the picker, the list filter,
// and the breakdown chart all read from this array so they can never drift apart.

import type { ExpenseCategory } from '@/types/db';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'Rent',
  'Salaries',
  'Electricity',
  'Internet',
  'Fuel',
  'Vehicle Maintenance',
  'Travel',
  'Supplies',
  'Marketing',
  'Repairs',
  'Utilities',
  'Misc',
] as const;

/**
 * Chart colour per category. Fixed rather than index-derived so a category keeps
 * the same colour as totals reorder the breakdown between renders.
 */
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Rent: '#0F62FE',
  Salaries: '#6929C4',
  Electricity: '#F1C21B',
  Internet: '#1192E8',
  Fuel: '#DA1E28',
  'Vehicle Maintenance': '#FA4D56',
  Travel: '#005D5D',
  Supplies: '#198038',
  Marketing: '#EE538B',
  Repairs: '#B28600',
  Utilities: '#009D9A',
  Misc: '#8D8D8D',
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category as ExpenseCategory] ?? CATEGORY_COLORS.Misc;
}
