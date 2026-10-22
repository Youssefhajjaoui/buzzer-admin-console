import { describe, expect, it } from 'vitest';
import { canManagePayments, summaryFor } from './payment.model';

describe('canManagePayments', () => {
  it('allows an admin or operator to change a payment status', () => {
    expect(canManagePayments('ADMIN')).toBe(true);
    expect(canManagePayments('operator')).toBe(true);
    expect(canManagePayments('VIEWER')).toBe(false);
    expect(canManagePayments('ORG')).toBe(false);
  });
});

describe('summaryFor', () => {
  it('reads the formatted total for a status', () => {
    const row = summaryFor(
      {
        grossRevenue: '$10.00',
        byStatus: [{ status: 'COMPLETED', count: 2, total: '$10.00' }],
      },
      'COMPLETED',
    );

    expect(row?.total).toBe('$10.00');
    expect(summaryFor(null, 'FAILED')).toBeNull();
  });
});
