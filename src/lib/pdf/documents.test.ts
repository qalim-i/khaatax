import {
  buildChallanHtml,
  buildDocumentHtml,
  buildInvoiceHtml,
  documentFileName,
  documentTitle,
  escapeHtml,
} from '@/lib/pdf/documents';
import type { Party, Transaction } from '@/types/db';

function party(overrides: Partial<Party> = {}): Party {
  return {
    id: 'party-1',
    name: 'Sharma Gases',
    contact: '98765 43210',
    security_deposit: 5000,
    balance: 12,
    amount_due: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    party_id: 'party-1',
    date: '2026-08-11',
    invoice_no: 201,
    dc_no: 145,
    cylinder_type: 'Oxygen 40L',
    filled_sent: 10,
    empty_received: 4,
    amount: 12500,
    created_by: 'user-1',
    created_at: '2026-08-11T09:00:00Z',
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('neutralises characters that would corrupt the document', () => {
    expect(escapeHtml(`Sharma & Co <Gas> "Ltd" 'x'`)).toBe(
      'Sharma &amp; Co &lt;Gas&gt; &quot;Ltd&quot; &#39;x&#39;'
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Oxygen 40L')).toBe('Oxygen 40L');
  });
});

describe('invoice and challan numbering', () => {
  // TRD Section 4: invoice_no and dc_no come from independent sequences, so they
  // do not match. Conflating them would put the wrong number on a legal document.
  const tx = transaction({ invoice_no: 201, dc_no: 145 });

  it('titles each document with its own sequence number', () => {
    expect(documentTitle('invoice', tx)).toBe('Invoice INV-201');
    expect(documentTitle('challan', tx)).toBe('Delivery Challan DC-145');
  });

  it('names files after the number the document is for', () => {
    expect(documentFileName('invoice', tx)).toBe('INV-201.pdf');
    expect(documentFileName('challan', tx)).toBe('DC-145.pdf');
  });

  it('leads the invoice with INV and cross-references the DC', () => {
    const html = buildInvoiceHtml(party(), tx);
    expect(html).toContain('<p class="doc-number">INV-201</p>');
    expect(html).toContain('Ref DC: DC-145');
  });

  it('leads the challan with DC and cross-references the invoice', () => {
    const html = buildChallanHtml(party(), tx);
    expect(html).toContain('<p class="doc-number">DC-145</p>');
    expect(html).toContain('Ref Invoice: INV-201');
  });
});

describe('buildInvoiceHtml', () => {
  it('includes party details and the transaction line items (INV-5)', () => {
    const html = buildInvoiceHtml(party(), transaction());

    expect(html).toContain('Sharma Gases');
    expect(html).toContain('98765 43210');
    expect(html).toContain('Oxygen 40L');
    expect(html).toContain('<td class="num">10</td>');
    expect(html).toContain('<td class="num">4</td>');
  });

  it('shows net movement as filled sent minus empty received', () => {
    const html = buildInvoiceHtml(party(), transaction({ filled_sent: 10, empty_received: 4 }));
    expect(html).toContain('<td class="num">6</td>');
  });

  it('handles a return-only transaction with a negative net', () => {
    const html = buildInvoiceHtml(party(), transaction({ filled_sent: 0, empty_received: 7 }));
    expect(html).toContain('<td class="num">-7</td>');
  });

  it('carries the security deposit as currency and the balance as a bare count', () => {
    const html = buildInvoiceHtml(party({ security_deposit: 5000, balance: 12 }), transaction());

    expect(html).toContain('₹5,000');
    // The balance is a cylinder count, so it must not pick up a currency symbol.
    expect(html).toContain('<td class="value">12</td>');
  });

  it('omits the contact line when the party has no contact on file', () => {
    // Assert on the rendered element, not the class name — the stylesheet
    // mentions `.party-contact` whether or not the element is emitted.
    expect(buildInvoiceHtml(party(), transaction())).toContain('<p class="party-contact">');
    expect(buildInvoiceHtml(party({ contact: null }), transaction())).not.toContain(
      '<p class="party-contact">'
    );
  });

  it('escapes a party name containing markup', () => {
    const html = buildInvoiceHtml(party({ name: 'Sharma & Co <script>' }), transaction());

    expect(html).toContain('Sharma &amp; Co &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('escapes a cylinder type containing markup', () => {
    const html = buildInvoiceHtml(party(), transaction({ cylinder_type: 'A & B <b>' }));

    expect(html).toContain('A &amp; B &lt;b&gt;');
    expect(html).not.toContain('<b>');
  });
});

describe('amount charged', () => {
  // The manually-entered figure from migration 0009. It is printed on BOTH
  // documents by request, so it must survive on each of them independently.
  it('prints on the invoice, in the line item and as the charged total', () => {
    const html = buildInvoiceHtml(party(), transaction({ amount: 12500 }));

    expect(html).toContain('<td class="num">₹12,500.00</td>');
    expect(html).toContain('Amount Charged');
    expect(html).toContain('<td class="value">₹12,500.00</td>');
  });

  it('prints on the challan too', () => {
    const html = buildChallanHtml(party(), transaction({ amount: 12500 }));

    expect(html).toContain('<td class="num">₹12,500.00</td>');
    expect(html).toContain('Amount Charged');
  });

  it('shows an em dash rather than ₹0 when nothing was charged', () => {
    // Every transaction predating 0009 carries 0 because there was no field to
    // fill in. Printing "₹0" on those would assert a free delivery.
    for (const html of [
      buildInvoiceHtml(party(), transaction({ amount: 0 })),
      buildChallanHtml(party(), transaction({ amount: 0 })),
    ]) {
      expect(html).toContain('&mdash;');
      expect(html).not.toContain('₹0<');
    }
  });

  it('prints paise rather than rounding them away', () => {
    // A charge of ₹1,250.50 shown as "₹1,251" is a figure on paper the party is
    // handed that does not match what was recorded — hence formatCurrencyExact
    // on documents, not the whole-rupee formatCurrency the dashboards use.
    const html = buildInvoiceHtml(party(), transaction({ amount: 1250.5 }));

    expect(html).toContain('₹1,250.50');
    expect(html).not.toContain('₹1,251<');
  });
});

describe('account balance on the invoice', () => {
  // migration 0010. The invoice is the billing document, so it carries the
  // running money balance; the challan does not.
  it('prints what the party owes, labelled', () => {
    const html = buildInvoiceHtml(party({ amount_due: 47500 }), transaction());

    expect(html).toContain('Owes');
    expect(html).toContain('₹47,500.00');
  });

  it('prints a credit as a positive figure, never as a negative amount owed', () => {
    // The failure this guards: "-₹2,500.00" under a heading that says the party
    // owes it. An advance means the business owes THEM.
    const html = buildInvoiceHtml(party({ amount_due: -2500 }), transaction());

    expect(html).toContain('In credit');
    expect(html).toContain('advance held');
    expect(html).toContain('₹2,500.00');
    expect(html).not.toContain('-₹2,500');
    expect(html).not.toContain('₹-2,500');
  });

  it('says settled when the account is square', () => {
    const html = buildInvoiceHtml(party({ amount_due: 0 }), transaction());

    expect(html).toContain('Settled');
    expect(html).toContain('₹0.00');
  });

  it('keeps the cylinder count out of the money block', () => {
    // Two balances exist per party and they are not interchangeable: `balance`
    // is a count of cylinders, `amount_due` is rupees. The count must never pick
    // up a currency symbol.
    const html = buildInvoiceHtml(party({ balance: 12, amount_due: 47500 }), transaction());

    expect(html).toContain('Cylinders Held (count)');
    expect(html).toContain('<td class="value">12</td>');
  });
});

describe('buildChallanHtml', () => {
  it('carries the charged amount but no other money — a challan is not a statement', () => {
    // The challan gained `amount` in 0009. It still carries no deposit and no
    // outstanding balance: those belong to the billing record, not to the paper
    // that travels with the goods.
    const html = buildChallanHtml(
      party({ security_deposit: 5000, amount_due: 47500 }),
      transaction()
    );

    expect(html).toContain('Oxygen 40L');
    expect(html).toContain('<td class="num">10</td>');
    expect(html).not.toContain('Security Deposit');
    expect(html).not.toContain('₹5,000');
    expect(html).not.toContain('Cylinders Held');
    // The running account balance is the invoice's job. A challan travels with
    // the goods and is often handed to a driver.
    expect(html).not.toContain('₹47,500.00');
    expect(html).not.toContain('Owes');
  });
});

describe('buildDocumentHtml', () => {
  it('dispatches on kind', () => {
    const p = party();
    const tx = transaction();

    expect(buildDocumentHtml('invoice', p, tx)).toBe(buildInvoiceHtml(p, tx));
    expect(buildDocumentHtml('challan', p, tx)).toBe(buildChallanHtml(p, tx));
  });
});
