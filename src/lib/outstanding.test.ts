import { computeOutstanding, type OutstandingTransactionInput } from '@/lib/outstanding';

// Fixed "today" so overdue-day assertions don't drift as the calendar moves.
const NOW = new Date(2026, 7, 11); // 2026-08-11

function tx(
  date: string,
  filled_sent: number,
  empty_received: number,
  overrides: Partial<OutstandingTransactionInput> = {}
): OutstandingTransactionInput {
  return {
    party_id: 'party-1',
    cylinder_type: 'Oxygen 40L',
    date,
    filled_sent,
    empty_received,
    ...overrides,
  };
}

describe('computeOutstanding', () => {
  it('ages the remainder from the original dispatch after a partial return', () => {
    expect(computeOutstanding([tx('2026-06-01', 10, 0), tx('2026-07-01', 0, 4)], NOW)).toEqual([
      {
        partyId: 'party-1',
        cylinderType: 'Oxygen 40L',
        quantity: 6,
        oldestDate: '2026-06-01',
        overdueDays: 71,
      },
    ]);
  });

  it('re-ages to the next lot once a return clears the oldest one', () => {
    const rows = computeOutstanding(
      [tx('2026-06-01', 5, 0), tx('2026-07-01', 5, 0), tx('2026-07-15', 0, 5)],
      NOW
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(5);
    expect(rows[0].oldestDate).toBe('2026-07-01');
  });

  it('keeps the oldest lot open when a return only partly covers it', () => {
    const rows = computeOutstanding(
      [tx('2026-06-01', 5, 0), tx('2026-07-01', 5, 0), tx('2026-07-15', 0, 3)],
      NOW
    );

    expect(rows[0].quantity).toBe(7);
    expect(rows[0].oldestDate).toBe('2026-06-01');
  });

  it('drops fully-settled parties from the report', () => {
    expect(computeOutstanding([tx('2026-06-01', 5, 0), tx('2026-07-01', 0, 5)], NOW)).toEqual([]);
  });

  it('clamps at zero when returns exceed everything on record', () => {
    // Real case: cylinders sent before the business moved onto KhaataX come back
    // without a matching filled_sent row. Must not produce a negative row.
    expect(computeOutstanding([tx('2026-06-01', 2, 0), tx('2026-07-01', 0, 9)], NOW)).toEqual([]);
  });

  it('never closes one cylinder type with a return of another', () => {
    const rows = computeOutstanding(
      [
        tx('2026-06-01', 3, 0, { cylinder_type: 'A' }),
        tx('2026-06-02', 4, 0, { cylinder_type: 'B' }),
        tx('2026-07-01', 0, 4, { cylinder_type: 'B' }),
      ],
      NOW
    );

    expect(rows).toEqual([
      { partyId: 'party-1', cylinderType: 'A', quantity: 3, oldestDate: '2026-06-01', overdueDays: 71 },
    ]);
  });

  it("never closes one party's lots with another party's return", () => {
    const rows = computeOutstanding(
      [
        tx('2026-06-01', 3, 0, { party_id: 'p1' }),
        tx('2026-06-02', 3, 0, { party_id: 'p2' }),
        tx('2026-07-01', 0, 3, { party_id: 'p2' }),
      ],
      NOW
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].partyId).toBe('p1');
  });

  it('sorts unordered input before aging it', () => {
    const rows = computeOutstanding(
      [tx('2026-07-15', 0, 5), tx('2026-07-01', 5, 0), tx('2026-06-01', 5, 0)],
      NOW
    );

    expect(rows[0].quantity).toBe(5);
    expect(rows[0].oldestDate).toBe('2026-07-01');
  });

  it('nets out a transaction that both delivers and collects', () => {
    const rows = computeOutstanding([tx('2026-08-01', 10, 4)], NOW);

    expect(rows[0].quantity).toBe(6);
    expect(rows[0].overdueDays).toBe(10);
  });

  it('returns nothing for a party with no transactions at all', () => {
    expect(computeOutstanding([], NOW)).toEqual([]);
  });
});
