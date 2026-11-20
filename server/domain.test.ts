import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBillTotals,
  canRoleAccessFinance,
  canRoleVerifyPayments,
  canTransitionComplaint,
  computeSlaDueAt,
  deriveBillStatus,
  hasBookingConflict,
  maskPhoneNumber,
  validatePaymentAmount,
} from './domain';

test('calculateBillTotals computes subtotal, late fee, and discount accurately', () => {
  const result = calculateBillTotals(
    [
      { description: 'Monthly Maintenance', amount: 3500 },
      { description: 'Water Charges', amount: 450.5 },
      { description: 'Sinking Fund', amount: 250.25 },
    ],
    200,
    100
  );
  assert.equal(result.subtotal, 4200.75);
  assert.equal(result.totalAmount, 4100.75);
});

test('deriveBillStatus transitions ISSUED, PARTIALLY_PAID, PAID, and OVERDUE accurately', () => {
  const now = '2026-11-20T10:00:00.000Z';
  assert.equal(
    deriveBillStatus({ status: 'ISSUED', totalAmount: 4000, amountPaid: 4000, dueDate: '2026-11-25' }, now),
    'PAID'
  );
  assert.equal(
    deriveBillStatus({ status: 'ISSUED', totalAmount: 4000, amountPaid: 1500, dueDate: '2026-11-25' }, now),
    'PARTIALLY_PAID'
  );
  assert.equal(
    deriveBillStatus({ status: 'ISSUED', totalAmount: 4000, amountPaid: 0, dueDate: '2026-11-10' }, now),
    'OVERDUE'
  );
  assert.equal(
    deriveBillStatus({ status: 'CANCELLED', totalAmount: 4000, amountPaid: 0, dueDate: '2026-11-10' }, now),
    'CANCELLED'
  );
});

test('validatePaymentAmount blocks overpayment and respects partial payment policy', () => {
  const over = validatePaymentAmount(5000, 4000, { allowPartialPayments: true, allowOverpayment: false });
  assert.equal(over.valid, false);

  const partialDisallowed = validatePaymentAmount(2000, 4000, { allowPartialPayments: false, allowOverpayment: false });
  assert.equal(partialDisallowed.valid, false);

  const partialAllowed = validatePaymentAmount(2000, 4000, { allowPartialPayments: true, allowOverpayment: false });
  assert.equal(partialAllowed.valid, true);
});

test('hasBookingConflict prevents overlapping slots and allows non-overlapping or cancelled slots', () => {
  const existing = [
    {
      id: 'b1',
      facilityId: 'fac-club',
      startAt: '2026-11-22T10:00:00.000Z',
      endAt: '2026-11-22T12:00:00.000Z',
      status: 'CONFIRMED' as const,
    },
    {
      id: 'b2',
      facilityId: 'fac-club',
      startAt: '2026-11-22T14:00:00.000Z',
      endAt: '2026-11-22T16:00:00.000Z',
      status: 'CANCELLED' as const,
    },
  ];

  assert.equal(
    hasBookingConflict(existing, {
      facilityId: 'fac-club',
      startAt: '2026-11-22T11:00:00.000Z',
      endAt: '2026-11-22T13:00:00.000Z',
    }),
    true
  );

  assert.equal(
    hasBookingConflict(existing, {
      facilityId: 'fac-club',
      startAt: '2026-11-22T12:00:00.000Z',
      endAt: '2026-11-22T14:00:00.000Z',
    }),
    false
  );

  assert.equal(
    hasBookingConflict(existing, {
      facilityId: 'fac-club',
      startAt: '2026-11-22T14:30:00.000Z',
      endAt: '2026-11-22T15:30:00.000Z',
    }),
    false
  );
});

test('complaint transitions and SLA computation follow lifecycle rules', () => {
  assert.equal(canTransitionComplaint('OPEN', 'ASSIGNED'), true);
  assert.equal(canTransitionComplaint('OPEN', 'RESOLVED'), false);
  assert.equal(canTransitionComplaint('RESOLVED', 'REOPENED'), true);
  assert.equal(canTransitionComplaint('CLOSED', 'OPEN'), false);

  const created = '2026-11-20T08:00:00.000Z';
  assert.equal(computeSlaDueAt('URGENT', created), '2026-11-20T12:00:00.000Z');
  assert.equal(computeSlaDueAt('HIGH', created), '2026-11-20T20:00:00.000Z');
});

test('RBAC helpers enforce finance and payment verification boundaries', () => {
  assert.equal(canRoleAccessFinance('SECURITY'), false);
  assert.equal(canRoleAccessFinance('MAINTENANCE_STAFF'), false);
  assert.equal(canRoleAccessFinance('SOCIETY_ADMIN'), true);
  assert.equal(canRoleVerifyPayments('RESIDENT'), false);
  assert.equal(canRoleVerifyPayments('SOCIETY_ADMIN'), true);
});

test('maskPhoneNumber hides leading digits', () => {
  assert.equal(maskPhoneNumber('+91 98765 43210'), '******3210');
});
