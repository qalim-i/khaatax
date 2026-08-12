/**
 * Invoice and Delivery Challan documents, as HTML strings (PRD INV-5).
 *
 * These are pure string builders with no Expo or React dependency, so they are
 * unit-testable and reusable if the deferred owner web view (PRD GEN-3) is ever
 * built. Rendering to an actual PDF happens in `use-export-pdf`, which is the
 * only piece that touches the device.
 *
 * SAD.md Section 7 originally specified server-side generation via a Supabase
 * Edge Function. That was reconsidered in Phase 4: with the web client deferred
 * there is only one consumer, and an Edge Function would have added a deploy
 * pipeline and a service-role data path next to the payroll RLS boundary for no
 * gain. Keeping the template here preserves the SAD's actual goal — one
 * definition of the layout — without the server. See SAD.md Section 7.
 *
 * Invoice vs Delivery Challan is a real distinction, not two names for one
 * document: the invoice is the billing record and carries the money columns and
 * `invoice_no`; the challan accompanies the goods and carries only quantities
 * and `dc_no`. The two numbers come from independent sequences, so a
 * transaction's INV and DC numbers do not match and must never be conflated
 * (TRD Section 4).
 */

import { BUSINESS } from '@/constants/business';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { Party, Transaction } from '@/types/db';

export type DocumentKind = 'invoice' | 'challan';

/**
 * Party names and cylinder types are free text typed by a user. Interpolating
 * them raw would let an ampersand or angle bracket corrupt the document, so
 * every dynamic value goes through here.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "Invoice INV-201" / "Delivery Challan DC-145" — also used for the filename. */
export function documentTitle(kind: DocumentKind, tx: Transaction): string {
  return kind === 'invoice' ? `Invoice INV-${tx.invoice_no}` : `Delivery Challan DC-${tx.dc_no}`;
}

/** Safe for a filesystem: no spaces, no separators. */
export function documentFileName(kind: DocumentKind, tx: Transaction): string {
  return kind === 'invoice' ? `INV-${tx.invoice_no}.pdf` : `DC-${tx.dc_no}.pdf`;
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #111827;
    margin: 0;
    padding: 32px;
    font-size: 13px;
    line-height: 1.5;
  }
  .letterhead { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
  .business { font-size: 20px; font-weight: 700; margin: 0; }
  .business-meta { color: #6B7280; font-size: 11px; margin: 2px 0 0; }
  .doc-bar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
  .doc-kind { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
  .doc-number { font-size: 13px; color: #6B7280; margin: 2px 0 0; }
  .doc-date { text-align: right; font-size: 12px; color: #6B7280; }
  .section-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #6B7280; margin: 0 0 4px;
  }
  .party-name { font-size: 14px; font-weight: 600; margin: 0; }
  .party-contact { color: #6B7280; margin: 2px 0 0; }
  .party-block { margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th {
    text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #6B7280; border-bottom: 1px solid #D1D5DB; padding: 6px 8px; font-weight: 600;
  }
  td { padding: 8px; border-bottom: 1px solid #E5E7EB; }
  th.num, td.num { text-align: right; }
  .totals { width: 100%; margin-bottom: 24px; }
  .totals td { border: none; padding: 3px 8px; }
  .totals .label { color: #6B7280; }
  .totals .value { text-align: right; font-weight: 600; }
  .totals .emphasis td { border-top: 1px solid #D1D5DB; padding-top: 8px; font-size: 14px; }
  .note {
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px;
    padding: 10px 12px; color: #374151; font-size: 11px; margin-bottom: 24px;
  }
  .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
  .sign-box { width: 40%; border-top: 1px solid #9CA3AF; padding-top: 6px; font-size: 11px; color: #6B7280; }
  .sign-box.right { text-align: right; }
  footer { margin-top: 28px; font-size: 10px; color: #9CA3AF; text-align: center; }
  @page { margin: 0; }
`;

function letterhead(): string {
  const meta = [...BUSINESS.addressLines, BUSINESS.phone, BUSINESS.gstin ? `GSTIN ${BUSINESS.gstin}` : '']
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &middot; ');

  return `
    <div class="letterhead">
      <p class="business">${escapeHtml(BUSINESS.name)}</p>
      ${meta ? `<p class="business-meta">${meta}</p>` : ''}
    </div>`;
}

function partyBlock(party: Party): string {
  return `
    <div class="party-block">
      <p class="section-label">Billed To</p>
      <p class="party-name">${escapeHtml(party.name)}</p>
      ${party.contact ? `<p class="party-contact">${escapeHtml(party.contact)}</p>` : ''}
    </div>`;
}

function signatures(): string {
  return `
    <div class="signatures">
      <div class="sign-box">Receiver's Signature</div>
      <div class="sign-box right">For ${escapeHtml(BUSINESS.name)}</div>
    </div>`;
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
${body}
<footer>Generated by KhaataX on ${escapeHtml(formatDisplayDate(new Date().toISOString().slice(0, 10)))}</footer>
</body>
</html>`;
}

/**
 * The billing document. Carries `invoice_no` and the party's running cylinder
 * balance, which is what the invoice is actually settling.
 */
export function buildInvoiceHtml(party: Party, tx: Transaction): string {
  const title = documentTitle('invoice', tx);
  const netMovement = tx.filled_sent - tx.empty_received;

  return page(
    title,
    `
    ${letterhead()}
    <div class="doc-bar">
      <div>
        <p class="doc-kind">Invoice</p>
        <p class="doc-number">INV-${tx.invoice_no}</p>
      </div>
      <div class="doc-date">
        <div>Date: ${escapeHtml(formatDisplayDate(tx.date))}</div>
        <div>Ref DC: DC-${tx.dc_no}</div>
      </div>
    </div>
    ${partyBlock(party)}
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Filled Sent</th>
          <th class="num">Empty Received</th>
          <th class="num">Net</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(tx.cylinder_type)}</td>
          <td class="num">${tx.filled_sent}</td>
          <td class="num">${tx.empty_received}</td>
          <td class="num">${netMovement}</td>
        </tr>
      </tbody>
    </table>
    <table class="totals">
      <tbody>
        <tr>
          <td class="label">Security Deposit Held</td>
          <td class="value">${escapeHtml(formatCurrency(party.security_deposit))}</td>
        </tr>
        <tr class="emphasis">
          <td class="label">Cylinder Balance Outstanding</td>
          <td class="value">${escapeHtml(String(party.balance))}</td>
        </tr>
      </tbody>
    </table>
    <div class="note">
      Cylinder balance is a count of cylinders held by the party, not a monetary amount.
      Security deposit is refundable on return of all cylinders in good condition.
    </div>
    ${signatures()}`
  );
}

/**
 * The goods-movement document. Deliberately carries no money — a challan travels
 * with the delivery and records quantities only.
 */
export function buildChallanHtml(party: Party, tx: Transaction): string {
  const title = documentTitle('challan', tx);

  return page(
    title,
    `
    ${letterhead()}
    <div class="doc-bar">
      <div>
        <p class="doc-kind">Delivery Challan</p>
        <p class="doc-number">DC-${tx.dc_no}</p>
      </div>
      <div class="doc-date">
        <div>Date: ${escapeHtml(formatDisplayDate(tx.date))}</div>
        <div>Ref Invoice: INV-${tx.invoice_no}</div>
      </div>
    </div>
    ${partyBlock(party)}
    <table>
      <thead>
        <tr>
          <th>Cylinder Type</th>
          <th class="num">Filled Sent</th>
          <th class="num">Empty Received</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(tx.cylinder_type)}</td>
          <td class="num">${tx.filled_sent}</td>
          <td class="num">${tx.empty_received}</td>
        </tr>
      </tbody>
    </table>
    <div class="note">
      Goods received in good condition. This challan is not a bill &mdash; refer to
      INV-${tx.invoice_no} for billing.
    </div>
    ${signatures()}`
  );
}

export function buildDocumentHtml(kind: DocumentKind, party: Party, tx: Transaction): string {
  return kind === 'invoice' ? buildInvoiceHtml(party, tx) : buildChallanHtml(party, tx);
}
