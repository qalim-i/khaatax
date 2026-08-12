/**
 * Letterhead details printed on Invoice and Delivery Challan PDFs.
 *
 * Single-location business (CLAUDE.md), so this is a constant rather than a
 * table — there is no second branch to vary it by. Edit here to change what
 * appears on every generated document.
 */
export const BUSINESS = {
  name: 'KhaataX Oxygen Distributors',
  addressLines: ['Plot 14, Industrial Area', 'Phase II'],
  phone: '',
  gstin: '',
} as const;
