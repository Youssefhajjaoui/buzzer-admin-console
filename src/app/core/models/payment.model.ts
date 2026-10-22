export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface PaymentStatusSummary {
  status: PaymentStatus;
  count: number;
  total: string;
}

export interface PaymentSummary {
  byStatus: PaymentStatusSummary[];
  grossRevenue: string;
}

export interface Transaction {
  id: string;
  reference: string;
  amountFormatted: string;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  description: string | null;
  customer: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
export const PAYMENT_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  };
  return labels[status];
}

export function canManagePayments(role: string | null | undefined): boolean {
  const value = role?.toUpperCase() ?? '';
  return value === 'ADMIN' || value === 'OPERATOR';
}

export function summaryFor(summary: PaymentSummary | null, status: PaymentStatus): PaymentStatusSummary | null {
  return summary?.byStatus.find((row) => row.status === status) ?? null;
}
