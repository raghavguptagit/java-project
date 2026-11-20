import type {
  Bill,
  BillLineItem,
  BillStatus,
  Booking,
  ComplaintPriority,
  ComplaintStatus,
  Role,
} from '../src/types';

/**
 * Pure domain business rules for SocietySync.
 * Decoupled from Express/UI for fast deterministic unit testing via node:test.
 */

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateBillTotals(
  items: BillLineItem[],
  discount = 0,
  lateFee = 0
): { subtotal: number; totalAmount: number } {
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const safeDiscount = Math.max(0, roundCurrency(discount));
  const safeLateFee = Math.max(0, roundCurrency(lateFee));
  const totalAmount = Math.max(0, roundCurrency(subtotal + safeLateFee - safeDiscount));
  return { subtotal, totalAmount };
}

export function deriveBillStatus(
  bill: Pick<Bill, 'status' | 'totalAmount' | 'amountPaid' | 'dueDate'>,
  nowIso = new Date().toISOString()
): BillStatus {
  if (bill.status === 'CANCELLED' || bill.status === 'DRAFT') {
    return bill.status;
  }
  const paid = roundCurrency(bill.amountPaid);
  const total = roundCurrency(bill.totalAmount);
  if (paid >= total && total > 0) {
    return 'PAID';
  }
  if (paid > 0 && paid < total) {
    return 'PARTIALLY_PAID';
  }
  if (new Date(bill.dueDate).getTime() < new Date(nowIso).getTime()) {
    return 'OVERDUE';
  }
  return 'ISSUED';
}

export function validatePaymentAmount(
  amount: number,
  outstanding: number,
  options: { allowPartialPayments: boolean; allowOverpayment: boolean }
): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than zero.' };
  }
  const roundedAmount = roundCurrency(amount);
  const roundedOutstanding = roundCurrency(outstanding);
  if (!options.allowOverpayment && roundedAmount > roundedOutstanding) {
    return {
      valid: false,
      error: `Payment exceeds outstanding balance of ₹${roundedOutstanding.toFixed(2)}.`,
    };
  }
  if (!options.allowPartialPayments && roundedAmount < roundedOutstanding) {
    return {
      valid: false,
      error: 'Partial payments are disabled for this society. Please pay the full outstanding balance.',
    };
  }
  return { valid: true };
}

export function hasBookingConflict(
  existingBookings: Pick<Booking, 'id' | 'facilityId' | 'startAt' | 'endAt' | 'status'>[],
  candidate: { facilityId: string; startAt: string; endAt: string; excludeBookingId?: string }
): boolean {
  const start = new Date(candidate.startAt).getTime();
  const end = new Date(candidate.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return true;
  }
  return existingBookings.some((b) => {
    if (b.id === candidate.excludeBookingId) return false;
    if (b.facilityId !== candidate.facilityId) return false;
    if (b.status !== 'CONFIRMED' && b.status !== 'REQUESTED') return false;
    const bStart = new Date(b.startAt).getTime();
    const bEnd = new Date(b.endAt).getTime();
    return start < bEnd && end > bStart;
  });
}

const VALID_COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
  CLOSED: [],
};

export function canTransitionComplaint(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return VALID_COMPLAINT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function computeSlaDueAt(priority: ComplaintPriority, createdAtIso = new Date().toISOString()): string {
  const hoursByPriority: Record<ComplaintPriority, number> = {
    URGENT: 4,
    HIGH: 12,
    MEDIUM: 24,
    LOW: 72,
  };
  const ms = hoursByPriority[priority] * 60 * 60 * 1000;
  return new Date(new Date(createdAtIso).getTime() + ms).toISOString();
}

export function canRoleAccessFinance(role: Role): boolean {
  return role === 'SOCIETY_ADMIN' || role === 'COMMITTEE_MEMBER' || role === 'RESIDENT';
}

export function canRoleVerifyPayments(role: Role): boolean {
  return role === 'SOCIETY_ADMIN';
}

export function maskPhoneNumber(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `******${digits.slice(-4)}`;
}
