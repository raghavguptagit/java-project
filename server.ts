import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { generateSocietyAssistantReply } from './server/ai';
import { type AuthenticatedRequest, requireAuth, requireRoles, signToken } from './server/auth';
import { appendAudit, getDb, resetDb, saveDb, verifyPassword } from './server/db';
import {
  calculateBillTotals,
  canRoleAccessFinance,
  canRoleVerifyPayments,
  canTransitionComplaint,
  computeSlaDueAt,
  deriveBillStatus,
  hasBookingConflict,
  maskPhoneNumber,
  roundCurrency,
  validatePaymentAmount,
} from './server/domain';
import type { BillLineItem, ComplaintPriority, ComplaintStatus, PaymentMethod } from './src/types';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Security headers (iframe-safe for preview environments)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Simple sliding-window rate limiter for auth & AI endpoints
  const rateBuckets = new Map<string, number[]>();
  function rateLimit(maxRequests: number, windowMs: number) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const key = `${req.path}:${req.ip || 'unknown'}`;
      const now = Date.now();
      const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
      if (hits.length >= maxRequests) {
        res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
        return;
      }
      hits.push(now);
      rateBuckets.set(key, hits);
      next();
    };
  }

  const api = express.Router();

  // Health
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SocietySync API', timestamp: new Date().toISOString() });
  });

  // Auth
  api.post('/auth/login', rateLimit(30, 15 * 60 * 1000), (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const db = getDb();
    const normalized = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalized && u.status === 'ACTIVE');
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const { passwordHash: _ignored, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  });

  api.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const society = db.societies.find((s) => s.id === req.user!.societyId);
    res.json({ user: req.user, society });
  });

  api.post('/auth/logout', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  // Demo reset (local development convenience for Society Admin)
  api.post('/demo/reset', requireAuth, requireRoles('SOCIETY_ADMIN'), (_req, res) => {
    resetDb();
    res.json({ ok: true, message: 'Demo data reset to Green Valley Residency baseline.' });
  });

  // Society settings
  api.get('/societies/current', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const society = db.societies.find((s) => s.id === req.user!.societyId);
    if (!society) {
      res.status(404).json({ error: 'Society not found.' });
      return;
    }
    res.json(society);
  });

  api.patch('/societies/current', requireAuth, requireRoles('SOCIETY_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const society = db.societies.find((s) => s.id === req.user!.societyId);
    if (!society) {
      res.status(404).json({ error: 'Society not found.' });
      return;
    }
    const allowed = [
      'name',
      'address',
      'city',
      'state',
      'contactEmail',
      'contactPhone',
      'lateFeeAmount',
      'allowPartialPayments',
      'allowOverpayment',
      'reopenWindowDays',
    ] as const;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (society as unknown as Record<string, unknown>)[key] = req.body[key];
      }
    }
    appendAudit(db, {
      societyId: society.id,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'SOCIETY_SETTINGS_UPDATED',
      entityType: 'SOCIETY',
      entityId: society.id,
      details: 'Updated society configuration settings.',
    });
    saveDb(db);
    res.json(society);
  });

  // Dashboard summary
  api.get('/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const societyId = user.societyId;

    const societyFlats = db.flats.filter((f) => f.societyId === societyId);
    const occupiedFlats = societyFlats.filter((f) => f.occupancyStatus === 'OCCUPIED').length;

    const societyBills = db.bills
      .filter((b) => b.societyId === societyId && (user.role !== 'RESIDENT' || b.flatId === user.flatId))
      .map((b) => ({ ...b, status: deriveBillStatus(b) }));

    const totalBilled = roundCurrency(societyBills.reduce((s, b) => s + b.totalAmount, 0));
    const totalCollected = roundCurrency(societyBills.reduce((s, b) => s + b.amountPaid, 0));
    const totalOutstanding = roundCurrency(
      societyBills
        .filter((b) => b.status !== 'CANCELLED')
        .reduce((s, b) => s + Math.max(0, b.totalAmount - b.amountPaid), 0)
    );

    const societyComplaints = db.complaints.filter((c) => {
      if (c.societyId !== societyId) return false;
      if (user.role === 'RESIDENT') return c.flatId === user.flatId;
      if (user.role === 'MAINTENANCE_STAFF') return c.assignedStaffId === user.id;
      return true;
    });
    const openComplaints = societyComplaints.filter((c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;

    const societyVisitors = db.visitors.filter((v) => {
      if (v.societyId !== societyId) return false;
      if (user.role === 'RESIDENT') return v.flatId === user.flatId;
      return true;
    });
    const checkedInVisitors = societyVisitors.filter((v) => v.status === 'CHECKED_IN').length;
    const expectedVisitors = societyVisitors.filter((v) => v.status === 'EXPECTED' || v.status === 'AWAITING_APPROVAL').length;

    const societyExpenses = db.expenses.filter((e) => e.societyId === societyId);
    const approvedExpenses = roundCurrency(
      societyExpenses.filter((e) => e.status === 'APPROVED' || e.status === 'PAID').reduce((s, e) => s + e.amount, 0)
    );
    const pendingExpenses = societyExpenses.filter((e) => e.status === 'SUBMITTED').length;

    const upcomingBookings = db.bookings.filter(
      (b) => b.societyId === societyId && (b.status === 'CONFIRMED' || b.status === 'REQUESTED')
    ).length;

    const unreadNotices = db.notices.filter(
      (n) => n.societyId === societyId && n.status === 'PUBLISHED' && !n.readByUserIds.includes(user.id)
    ).length;

    const monthlySeries = [
      { month: 'Jul', collected: 142000, expenses: 118000 },
      { month: 'Aug', collected: 158000, expenses: 124500 },
      { month: 'Sep', collected: 161500, expenses: 132000 },
      { month: 'Oct', collected: 169000, expenses: 148000 },
      { month: 'Nov', collected: Math.max(totalCollected, 7250), expenses: approvedExpenses },
    ];

    const complaintByStatus = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => ({
      status,
      count: societyComplaints.filter((c) => c.status === status).length,
    }));

    res.json({
      kpis: {
        totalFlats: societyFlats.length,
        occupiedFlats,
        totalBilled,
        totalCollected,
        totalOutstanding,
        openComplaints,
        totalComplaints: societyComplaints.length,
        checkedInVisitors,
        expectedVisitors,
        approvedExpenses,
        pendingExpenses,
        upcomingBookings,
        unreadNotices,
      },
      monthlySeries,
      complaintByStatus,
    });
  });

  // Buildings & Flats
  api.get('/buildings', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.buildings.filter((b) => b.societyId === req.user!.societyId));
  });

  api.get('/flats', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = req.user!;
    let flats = db.flats.filter((f) => f.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      flats = flats.filter((f) => f.id === user.flatId);
    }
    res.json(flats);
  });

  api.post('/flats', requireAuth, requireRoles('SOCIETY_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { buildingId, floorNumber, unitNumber, flatType, areaSqft, occupancyStatus, residentName } = req.body ?? {};
    if (!buildingId || !unitNumber) {
      res.status(400).json({ error: 'Building and unit number are required.' });
      return;
    }
    const building = db.buildings.find((b) => b.id === buildingId && b.societyId === req.user!.societyId);
    if (!building) {
      res.status(404).json({ error: 'Building not found.' });
      return;
    }
    const duplicate = db.flats.some(
      (f) =>
        f.societyId === req.user!.societyId &&
        f.buildingId === buildingId &&
        f.unitNumber.toLowerCase() === String(unitNumber).trim().toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({ error: `Unit ${unitNumber} already exists in ${building.name}.` });
      return;
    }
    const flat = {
      id: `flat-${crypto.randomUUID().slice(0, 8)}`,
      societyId: req.user!.societyId,
      buildingId: building.id,
      buildingName: building.name,
      floorNumber: Number(floorNumber) || 1,
      unitNumber: String(unitNumber).trim().toUpperCase(),
      flatType: String(flatType || '2 BHK'),
      areaSqft: Number(areaSqft) || 1150,
      occupancyStatus: occupancyStatus || (residentName ? 'OCCUPIED' : 'VACANT'),
      residentName: residentName ? String(residentName).trim() : undefined,
    };
    db.flats.push(flat);
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'FLAT_CREATED',
      entityType: 'FLAT',
      entityId: flat.id,
      details: `Created flat ${flat.unitNumber} in ${building.name}.`,
    });
    saveDb(db);
    res.status(201).json(flat);
  });

  // Bills & Payments
  api.get('/bills', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleAccessFinance(user.role)) {
      res.status(403).json({ error: 'Your role cannot access financial billing records.' });
      return;
    }
    const db = getDb();
    let bills = db.bills.filter((b) => b.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      bills = bills.filter((b) => b.flatId === user.flatId);
    }
    res.json(bills.map((b) => ({ ...b, status: deriveBillStatus(b) })));
  });

  api.post('/bills', requireAuth, requireRoles('SOCIETY_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { flatId, billingPeriod, dueDate, items, discount = 0, lateFee = 0, notes } = req.body ?? {};
    if (!flatId || !billingPeriod || !dueDate || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Flat, billing period, due date, and at least one line item are required.' });
      return;
    }
    const flat = db.flats.find((f) => f.id === flatId && f.societyId === req.user!.societyId);
    if (!flat) {
      res.status(404).json({ error: 'Flat not found.' });
      return;
    }
    const cleanItems: BillLineItem[] = items.map((i: BillLineItem) => ({
      description: String(i.description || 'Maintenance Charge').trim(),
      amount: roundCurrency(Number(i.amount) || 0),
    }));
    const { subtotal, totalAmount } = calculateBillTotals(cleanItems, Number(discount), Number(lateFee));
    if (totalAmount <= 0) {
      res.status(400).json({ error: 'Bill total must be greater than zero.' });
      return;
    }
    const seq = String(db.bills.length + 1).padStart(3, '0');
    const bill = {
      id: `bill-${crypto.randomUUID().slice(0, 8)}`,
      societyId: req.user!.societyId,
      flatId: flat.id,
      flatLabel: flat.unitNumber,
      residentName: flat.residentName || 'Unassigned Unit',
      billNumber: `GVR-2026-11-${seq}`,
      billingPeriod: String(billingPeriod).trim(),
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: String(dueDate),
      items: cleanItems,
      subtotal,
      discount: roundCurrency(Number(discount)),
      lateFee: roundCurrency(Number(lateFee)),
      totalAmount,
      amountPaid: 0,
      status: 'ISSUED' as const,
      notes: notes ? String(notes) : undefined,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    db.bills.unshift(bill);
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'BILL_ISSUED',
      entityType: 'BILL',
      entityId: bill.id,
      details: `Issued bill ${bill.billNumber} for ${flat.unitNumber} (₹${totalAmount}).`,
    });
    saveDb(db);
    res.status(201).json(bill);
  });

  api.get('/payments', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleAccessFinance(user.role)) {
      res.status(403).json({ error: 'Your role cannot access payment records.' });
      return;
    }
    const db = getDb();
    let payments = db.payments.filter((p) => p.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      payments = payments.filter((p) => p.flatId === user.flatId);
    }
    res.json(payments);
  });

  api.post('/bills/:id/payments', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleAccessFinance(user.role)) {
      res.status(403).json({ error: 'Unauthorized to submit payments.' });
      return;
    }
    const db = getDb();
    const bill = db.bills.find((b) => b.id === req.params.id && b.societyId === user.societyId);
    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }
    if (user.role === 'RESIDENT' && bill.flatId !== user.flatId) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }
    const society = db.societies.find((s) => s.id === user.societyId)!;
    const { amount, method, transactionReference, idempotencyKey } = req.body ?? {};
    if (idempotencyKey) {
      const existing = db.payments.find((p) => p.idempotencyKey === idempotencyKey && p.societyId === user.societyId);
      if (existing) {
        res.json(existing);
        return;
      }
    }
    if (!transactionReference || String(transactionReference).trim().length < 4) {
      res.status(400).json({ error: 'A valid transaction reference (min 4 chars) is required.' });
      return;
    }
    const duplicateRef = db.payments.some(
      (p) =>
        p.societyId === user.societyId &&
        p.status !== 'REJECTED' &&
        p.transactionReference.toLowerCase() === String(transactionReference).trim().toLowerCase()
    );
    if (duplicateRef) {
      res.status(409).json({ error: 'Duplicate transaction reference detected.' });
      return;
    }
    const outstanding = roundCurrency(bill.totalAmount - bill.amountPaid);
    const check = validatePaymentAmount(Number(amount), outstanding, {
      allowPartialPayments: society.allowPartialPayments,
      allowOverpayment: society.allowOverpayment,
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const isAutoVerify = user.role === 'SOCIETY_ADMIN';
    const payment = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      societyId: user.societyId,
      billId: bill.id,
      billNumber: bill.billNumber,
      flatId: bill.flatId,
      flatLabel: bill.flatLabel,
      amount: roundCurrency(Number(amount)),
      method: (method || 'UPI') as PaymentMethod,
      transactionReference: String(transactionReference).trim(),
      status: isAutoVerify ? ('VERIFIED' as const) : ('PENDING_VERIFICATION' as const),
      receiptNumber: isAutoVerify ? `RCPT-2026-${1100 + db.payments.length + 1}` : undefined,
      submittedBy: user.displayName,
      submittedAt: new Date().toISOString(),
      verifiedBy: isAutoVerify ? user.displayName : undefined,
      verifiedAt: isAutoVerify ? new Date().toISOString() : undefined,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
    };

    db.payments.unshift(payment);
    if (isAutoVerify) {
      bill.amountPaid = roundCurrency(bill.amountPaid + payment.amount);
      bill.status = deriveBillStatus(bill);
      bill.version += 1;
    }
    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: isAutoVerify ? 'PAYMENT_RECORDED_AND_VERIFIED' : 'PAYMENT_SUBMITTED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      details: `${user.displayName} submitted ₹${payment.amount} (${payment.method}) for ${bill.billNumber}.`,
    });
    saveDb(db);
    res.status(201).json(payment);
  });

  api.post('/payments/:id/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleVerifyPayments(user.role)) {
      res.status(403).json({ error: 'Only Society Admin can verify payments.' });
      return;
    }
    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id && p.societyId === user.societyId);
    if (!payment) {
      res.status(404).json({ error: 'Payment not found.' });
      return;
    }
    if (payment.status !== 'PENDING_VERIFICATION') {
      res.status(400).json({ error: `Payment is already ${payment.status}.` });
      return;
    }
    const bill = db.bills.find((b) => b.id === payment.billId && b.societyId === user.societyId);
    if (!bill) {
      res.status(404).json({ error: 'Associated bill not found.' });
      return;
    }
    payment.status = 'VERIFIED';
    payment.verifiedBy = user.displayName;
    payment.verifiedAt = new Date().toISOString();
    payment.receiptNumber = `RCPT-2026-${1100 + db.payments.length + 1}`;
    bill.amountPaid = roundCurrency(bill.amountPaid + payment.amount);
    bill.status = deriveBillStatus(bill);
    bill.version += 1;

    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: 'PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      details: `Verified ₹${payment.amount} for ${bill.billNumber}. Receipt ${payment.receiptNumber}.`,
    });
    saveDb(db);
    res.json({ payment, bill });
  });

  api.post('/payments/:id/reject', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleVerifyPayments(user.role)) {
      res.status(403).json({ error: 'Only Society Admin can reject payments.' });
      return;
    }
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required.' });
      return;
    }
    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id && p.societyId === user.societyId);
    if (!payment || payment.status !== 'PENDING_VERIFICATION') {
      res.status(404).json({ error: 'Pending payment not found.' });
      return;
    }
    payment.status = 'REJECTED';
    payment.rejectionReason = reason;
    payment.verifiedBy = user.displayName;
    payment.verifiedAt = new Date().toISOString();
    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: 'PAYMENT_REJECTED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      details: `Rejected payment ${payment.transactionReference}: ${reason}`,
    });
    saveDb(db);
    res.json(payment);
  });

  // Complaints
  api.get('/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role === 'SECURITY') {
      res.status(403).json({ error: 'Security role cannot access resident complaints.' });
      return;
    }
    const db = getDb();
    let list = db.complaints.filter((c) => c.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      list = list.filter((c) => c.flatId === user.flatId);
    } else if (user.role === 'MAINTENANCE_STAFF') {
      list = list.filter((c) => c.assignedStaffId === user.id);
    }
    res.json(list);
  });

  api.post('/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role === 'SECURITY') {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }
    const db = getDb();
    const { category, title, description, priority = 'MEDIUM', flatId } = req.body ?? {};
    if (!title || !description || !category) {
      res.status(400).json({ error: 'Category, title, and description are required.' });
      return;
    }
    const targetFlatId = user.role === 'RESIDENT' ? user.flatId : flatId || db.flats[0]?.id;
    const flat = db.flats.find((f) => f.id === targetFlatId && f.societyId === user.societyId);
    if (!flat) {
      res.status(400).json({ error: 'Valid flat is required.' });
      return;
    }
    const now = new Date().toISOString();
    const seq = String(101 + db.complaints.length).padStart(6, '0');
    const complaint = {
      id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
      societyId: user.societyId,
      ticketNumber: `SS-2026-${seq}`,
      flatId: flat.id,
      flatLabel: flat.unitNumber,
      createdBy: user.id,
      createdByName: user.displayName,
      category: String(category),
      title: String(title).trim(),
      description: String(description).trim(),
      priority: priority as ComplaintPriority,
      status: 'OPEN' as ComplaintStatus,
      slaDueAt: computeSlaDueAt(priority as ComplaintPriority, now),
      createdAt: now,
      events: [
        {
          id: `ev-${crypto.randomUUID().slice(0, 6)}`,
          actorName: user.displayName,
          actorRole: user.role,
          eventType: 'CREATED',
          note: 'Complaint ticket created.',
          createdAt: now,
        },
      ],
    };
    db.complaints.unshift(complaint);
    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: 'COMPLAINT_CREATED',
      entityType: 'COMPLAINT',
      entityId: complaint.id,
      details: `Created ticket ${complaint.ticketNumber} (${complaint.category}, ${complaint.priority}).`,
    });
    saveDb(db);
    res.status(201).json(complaint);
  });

  api.post('/complaints/:id/assign', requireAuth, requireRoles('SOCIETY_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const complaint = db.complaints.find((c) => c.id === req.params.id && c.societyId === req.user!.societyId);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }
    const { staffUserId } = req.body ?? {};
    const staffMember = db.staff.find(
      (s) => (s.userId === staffUserId || s.id === staffUserId) && s.societyId === req.user!.societyId && s.active
    );
    if (!staffMember) {
      res.status(400).json({ error: 'Active staff member not found.' });
      return;
    }
    complaint.assignedStaffId = staffMember.userId || staffMember.id;
    complaint.assignedStaffName = staffMember.name;
    if (complaint.status === 'OPEN' || complaint.status === 'REOPENED') {
      complaint.status = 'ASSIGNED';
    }
    complaint.events.push({
      id: `ev-${crypto.randomUUID().slice(0, 6)}`,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      eventType: 'ASSIGNED',
      note: `Assigned to ${staffMember.name} (${staffMember.jobTitle}).`,
      createdAt: new Date().toISOString(),
    });
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'COMPLAINT_ASSIGNED',
      entityType: 'COMPLAINT',
      entityId: complaint.id,
      details: `Assigned ${complaint.ticketNumber} to ${staffMember.name}.`,
    });
    saveDb(db);
    res.json(complaint);
  });

  api.post('/complaints/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role === 'SECURITY' || user.role === 'COMMITTEE_MEMBER') {
      res.status(403).json({ error: 'Your role cannot update complaint status.' });
      return;
    }
    const db = getDb();
    const complaint = db.complaints.find((c) => c.id === req.params.id && c.societyId === user.societyId);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }
    const { status, note } = req.body ?? {};
    const nextStatus = status as ComplaintStatus;
    if (user.role === 'RESIDENT') {
      if (complaint.flatId !== user.flatId) {
        res.status(404).json({ error: 'Complaint not found.' });
        return;
      }
      if (nextStatus !== 'CLOSED' && nextStatus !== 'REOPENED') {
        res.status(403).json({ error: 'Residents may only confirm closure or reopen resolved complaints.' });
        return;
      }
    }
    if (user.role === 'MAINTENANCE_STAFF') {
      if (complaint.assignedStaffId !== user.id) {
        res.status(403).json({ error: 'You can only update complaints assigned to you.' });
        return;
      }
      if (nextStatus !== 'IN_PROGRESS' && nextStatus !== 'RESOLVED') {
        res.status(403).json({ error: 'Maintenance staff may only move assigned tickets to In Progress or Resolved.' });
        return;
      }
    }
    if (!canTransitionComplaint(complaint.status, nextStatus)) {
      res.status(400).json({ error: `Invalid status transition from ${complaint.status} to ${nextStatus}.` });
      return;
    }
    complaint.status = nextStatus;
    const now = new Date().toISOString();
    if (nextStatus === 'RESOLVED') complaint.resolvedAt = now;
    if (nextStatus === 'CLOSED') complaint.closedAt = now;
    complaint.events.push({
      id: `ev-${crypto.randomUUID().slice(0, 6)}`,
      actorName: user.displayName,
      actorRole: user.role,
      eventType: nextStatus,
      note: note ? String(note).trim() : `Status changed to ${nextStatus}.`,
      createdAt: now,
    });
    saveDb(db);
    res.json(complaint);
  });

  // Visitors & Gate
  api.get('/visitors', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role === 'MAINTENANCE_STAFF') {
      res.status(403).json({ error: 'Maintenance staff cannot access visitor logs.' });
      return;
    }
    const db = getDb();
    let list = db.visitors.filter((v) => v.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      list = list.filter((v) => v.flatId === user.flatId);
    }
    res.json(list);
  });

  api.post('/visitors', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const db = getDb();
    const { visitorName, phone, purpose, visitStart, visitEnd, visitorCount = 1, vehicleNumber, flatId, isWalkIn = false } =
      req.body ?? {};
    if (!visitorName || !purpose) {
      res.status(400).json({ error: 'Visitor name and purpose are required.' });
      return;
    }
    const targetFlatId = user.role === 'RESIDENT' ? user.flatId : flatId;
    const flat = db.flats.find((f) => f.id === targetFlatId && f.societyId === user.societyId);
    if (!flat) {
      res.status(400).json({ error: 'Valid flat is required.' });
      return;
    }
    const now = new Date();
    const code = `GVR-${crypto.randomInt(10000, 99999)}`;
    const record = {
      id: `vis-${crypto.randomUUID().slice(0, 8)}`,
      societyId: user.societyId,
      flatId: flat.id,
      flatLabel: flat.unitNumber,
      invitedBy: user.id,
      invitedByName: user.displayName,
      visitorName: String(visitorName).trim(),
      phoneMasked: maskPhoneNumber(phone ? String(phone) : undefined),
      purpose: String(purpose).trim(),
      visitStart: visitStart || now.toISOString(),
      visitEnd: visitEnd || new Date(now.getTime() + 1000 * 60 * 60 * 8).toISOString(),
      visitorCount: Math.max(1, Number(visitorCount) || 1),
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : undefined,
      inviteCode: code,
      isWalkIn: Boolean(isWalkIn),
      status: isWalkIn ? ('AWAITING_APPROVAL' as const) : ('EXPECTED' as const),
      createdAt: now.toISOString(),
    };
    db.visitors.unshift(record);
    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: isWalkIn ? 'WALKIN_REQUESTED' : 'VISITOR_INVITED',
      entityType: 'VISITOR',
      entityId: record.id,
      details: `${record.visitorName} for flat ${flat.unitNumber} (Code ${code}).`,
    });
    saveDb(db);
    res.status(201).json(record);
  });

  api.post('/visitors/:id/action', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role === 'MAINTENANCE_STAFF') {
      res.status(403).json({ error: 'Maintenance staff cannot perform visitor gate actions.' });
      return;
    }
    const db = getDb();
    const visitor = db.visitors.find((v) => v.id === req.params.id && v.societyId === user.societyId);
    if (!visitor) {
      res.status(404).json({ error: 'Visitor record not found.' });
      return;
    }
    const { action } = req.body ?? {};
    const now = new Date().toISOString();

    if (action === 'CHECK_IN') {
      if (user.role !== 'SECURITY' && user.role !== 'SOCIETY_ADMIN') {
        res.status(403).json({ error: 'Only Security or Admin can check in visitors.' });
        return;
      }
      if (visitor.status !== 'EXPECTED' && visitor.status !== 'APPROVED') {
        res.status(400).json({ error: `Cannot check in visitor with status ${visitor.status}.` });
        return;
      }
      visitor.status = 'CHECKED_IN';
      visitor.checkedInAt = now;
      visitor.checkedInBy = user.displayName;
    } else if (action === 'CHECK_OUT') {
      if (user.role !== 'SECURITY' && user.role !== 'SOCIETY_ADMIN') {
        res.status(403).json({ error: 'Only Security or Admin can check out visitors.' });
        return;
      }
      if (visitor.status !== 'CHECKED_IN') {
        res.status(400).json({ error: 'Visitor must be checked in before check-out.' });
        return;
      }
      visitor.status = 'CHECKED_OUT';
      visitor.checkedOutAt = now;
    } else if (action === 'APPROVE') {
      if (user.role === 'RESIDENT' && visitor.flatId !== user.flatId) {
        res.status(403).json({ error: 'Cannot approve visitor for another flat.' });
        return;
      }
      visitor.status = 'APPROVED';
    } else if (action === 'REVOKE' || action === 'DENY') {
      if (user.role === 'RESIDENT' && visitor.flatId !== user.flatId) {
        res.status(403).json({ error: 'Cannot modify visitor for another flat.' });
        return;
      }
      visitor.status = action === 'DENY' ? 'DENIED' : 'REVOKED';
    } else {
      res.status(400).json({ error: 'Unsupported visitor action.' });
      return;
    }

    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: `VISITOR_${action}`,
      entityType: 'VISITOR',
      entityId: visitor.id,
      details: `${action} for ${visitor.visitorName} (${visitor.flatLabel}).`,
    });
    saveDb(db);
    res.json(visitor);
  });

  // Notices
  api.get('/notices', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.notices.filter(
      (n) =>
        n.societyId === req.user!.societyId &&
        (req.user!.role === 'SOCIETY_ADMIN' || req.user!.role === 'COMMITTEE_MEMBER' || n.status === 'PUBLISHED')
    );
    res.json(list);
  });

  api.post('/notices', requireAuth, requireRoles('SOCIETY_ADMIN', 'COMMITTEE_MEMBER'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { title, body, category = 'General', priority = 'NORMAL', audience = 'All Residents', pinned = false } = req.body ?? {};
    if (!title || !body) {
      res.status(400).json({ error: 'Notice title and body are required.' });
      return;
    }
    const now = new Date().toISOString();
    const notice = {
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      societyId: req.user!.societyId,
      title: String(title).trim(),
      body: String(body).trim(),
      category: String(category),
      priority,
      audience: String(audience),
      status: 'PUBLISHED' as const,
      pinned: Boolean(pinned),
      publishedAt: now,
      createdByName: req.user!.displayName,
      readByUserIds: [req.user!.id],
    };
    db.notices.unshift(notice);
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'NOTICE_PUBLISHED',
      entityType: 'NOTICE',
      entityId: notice.id,
      details: `Published notice: ${notice.title}`,
    });
    saveDb(db);
    res.status(201).json(notice);
  });

  api.post('/notices/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const notice = db.notices.find((n) => n.id === req.params.id && n.societyId === req.user!.societyId);
    if (!notice) {
      res.status(404).json({ error: 'Notice not found.' });
      return;
    }
    if (!notice.readByUserIds.includes(req.user!.id)) {
      notice.readByUserIds.push(req.user!.id);
      saveDb(db);
    }
    res.json(notice);
  });

  // Facilities & Bookings
  api.get('/facilities', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.facilities.filter((f) => f.societyId === req.user!.societyId && f.active));
  });

  api.get('/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const list = db.bookings.filter((b) => b.societyId === user.societyId);
    res.json(list);
  });

  api.post('/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const db = getDb();
    const { facilityId, startAt, endAt, attendeeCount = 1, flatId } = req.body ?? {};
    if (!facilityId || !startAt || !endAt) {
      res.status(400).json({ error: 'Facility, start time, and end time are required.' });
      return;
    }
    const facility = db.facilities.find((f) => f.id === facilityId && f.societyId === user.societyId && f.active);
    if (!facility) {
      res.status(404).json({ error: 'Facility not found.' });
      return;
    }
    if (Number(attendeeCount) > facility.capacity) {
      res.status(400).json({ error: `Attendee count exceeds facility capacity of ${facility.capacity}.` });
      return;
    }
    if (hasBookingConflict(db.bookings.filter((b) => b.societyId === user.societyId), { facilityId, startAt, endAt })) {
      res.status(409).json({
        error: 'Booking conflict: this facility is already reserved during the selected time window.',
      });
      return;
    }
    const targetFlatId = user.role === 'RESIDENT' ? user.flatId : flatId || db.flats[0]?.id;
    const flat = db.flats.find((f) => f.id === targetFlatId && f.societyId === user.societyId);
    if (!flat) {
      res.status(400).json({ error: 'Valid flat is required for booking.' });
      return;
    }
    const booking = {
      id: `bkg-${crypto.randomUUID().slice(0, 8)}`,
      societyId: user.societyId,
      facilityId: facility.id,
      facilityName: facility.name,
      flatId: flat.id,
      flatLabel: flat.unitNumber,
      bookedBy: user.id,
      bookedByName: user.displayName,
      startAt,
      endAt,
      attendeeCount: Number(attendeeCount) || 1,
      fee: facility.fee,
      status: facility.approvalRequired && user.role !== 'SOCIETY_ADMIN' ? ('REQUESTED' as const) : ('CONFIRMED' as const),
      createdAt: new Date().toISOString(),
    };
    db.bookings.unshift(booking);
    appendAudit(db, {
      societyId: user.societyId,
      actorName: user.displayName,
      actorRole: user.role,
      action: 'BOOKING_CREATED',
      entityType: 'BOOKING',
      entityId: booking.id,
      details: `Booked ${facility.name} for ${flat.unitNumber} (${booking.status}).`,
    });
    saveDb(db);
    res.status(201).json(booking);
  });

  api.post('/bookings/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const db = getDb();
    const booking = db.bookings.find((b) => b.id === req.params.id && b.societyId === user.societyId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const { status } = req.body ?? {};
    if (status === 'CANCELLED') {
      if (user.role === 'RESIDENT' && booking.bookedBy !== user.id) {
        res.status(403).json({ error: 'You can only cancel your own bookings.' });
        return;
      }
      booking.status = 'CANCELLED';
    } else if (status === 'CONFIRMED' || status === 'REJECTED') {
      if (user.role !== 'SOCIETY_ADMIN') {
        res.status(403).json({ error: 'Only Society Admin can approve or reject bookings.' });
        return;
      }
      booking.status = status;
    } else {
      res.status(400).json({ error: 'Invalid booking status.' });
      return;
    }
    saveDb(db);
    res.json(booking);
  });

  // Expenses & Reports
  api.get('/expenses', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (!canRoleAccessFinance(user.role)) {
      res.status(403).json({ error: 'Unauthorized to view society expenses.' });
      return;
    }
    const db = getDb();
    let list = db.expenses.filter((e) => e.societyId === user.societyId);
    if (user.role === 'RESIDENT') {
      list = list.filter((e) => e.status === 'APPROVED' || e.status === 'PAID');
    }
    res.json(list);
  });

  api.post('/expenses', requireAuth, requireRoles('SOCIETY_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { category, vendorName, title, description, amount, expenseDate } = req.body ?? {};
    if (!category || !vendorName || !title || !amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Category, vendor, title, and positive amount are required.' });
      return;
    }
    const expense = {
      id: `exp-${crypto.randomUUID().slice(0, 8)}`,
      societyId: req.user!.societyId,
      category: String(category),
      vendorName: String(vendorName),
      title: String(title).trim(),
      description: String(description || '').trim(),
      amount: roundCurrency(Number(amount)),
      expenseDate: expenseDate || new Date().toISOString().slice(0, 10),
      status: 'SUBMITTED' as const,
      submittedByName: req.user!.displayName,
      createdAt: new Date().toISOString(),
    };
    db.expenses.unshift(expense);
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: 'EXPENSE_SUBMITTED',
      entityType: 'EXPENSE',
      entityId: expense.id,
      details: `Submitted expense "${expense.title}" for ₹${expense.amount}.`,
    });
    saveDb(db);
    res.status(201).json(expense);
  });

  api.post('/expenses/:id/decision', requireAuth, requireRoles('SOCIETY_ADMIN', 'COMMITTEE_MEMBER'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const expense = db.expenses.find((e) => e.id === req.params.id && e.societyId === req.user!.societyId);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }
    const { decision, reason } = req.body ?? {};
    if (decision === 'APPROVE') {
      expense.status = 'APPROVED';
      expense.approvedByName = req.user!.displayName;
    } else if (decision === 'MARK_PAID') {
      expense.status = 'PAID';
    } else if (decision === 'REJECT') {
      if (!reason) {
        res.status(400).json({ error: 'Rejection reason is required.' });
        return;
      }
      expense.status = 'REJECTED';
      expense.rejectionReason = String(reason);
    } else {
      res.status(400).json({ error: 'Invalid decision.' });
      return;
    }
    appendAudit(db, {
      societyId: req.user!.societyId,
      actorName: req.user!.displayName,
      actorRole: req.user!.role,
      action: `EXPENSE_${decision}`,
      entityType: 'EXPENSE',
      entityId: expense.id,
      details: `${decision} on "${expense.title}" (₹${expense.amount}).`,
    });
    saveDb(db);
    res.json(expense);
  });

  // Staff & Vendors
  api.get('/staff', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.staff.filter((s) => s.societyId === req.user!.societyId));
  });

  api.get('/vendors', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.vendors.filter((v) => v.societyId === req.user!.societyId));
  });

  // Notifications
  api.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.notifications.filter((n) => n.societyId === req.user!.societyId && n.userId === req.user!.id));
  });

  api.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    for (const n of db.notifications) {
      if (n.societyId === req.user!.societyId && n.userId === req.user!.id) {
        n.read = true;
      }
    }
    saveDb(db);
    res.json({ ok: true });
  });

  // Audit Log
  api.get('/audit', requireAuth, requireRoles('SOCIETY_ADMIN', 'COMMITTEE_MEMBER'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.auditLogs.filter((a) => a.societyId === req.user!.societyId).slice(0, 100));
  });

  // Gemini AI Society Assistant
  api.get('/ai/knowledge', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json(db.knowledgeDocs.filter((k) => k.societyId === req.user!.societyId));
  });

  api.post('/ai/chat', requireAuth, rateLimit(30, 15 * 60 * 1000), async (req: AuthenticatedRequest, res) => {
    const { message } = req.body ?? {};
    if (!message || String(message).trim().length < 2) {
      res.status(400).json({ error: 'Please enter a question.' });
      return;
    }
    const db = getDb();
    const user = req.user!;
    const society = db.societies.find((s) => s.id === user.societyId)!;
    const docs = db.knowledgeDocs.filter((d) => d.societyId === user.societyId && d.approved);

    let extraContext = '';
    if (user.role === 'RESIDENT' && user.flatId) {
      const ownBills = db.bills
        .filter((b) => b.societyId === user.societyId && b.flatId === user.flatId)
        .map((b) => `${b.billNumber} (${b.billingPeriod}): Total ₹${b.totalAmount}, Paid ₹${b.amountPaid}, Status ${deriveBillStatus(b)}, Due ${b.dueDate}`);
      if (ownBills.length > 0) {
        extraContext = `Resident's own billing summary:\n${ownBills.join('\n')}`;
      }
    }

    const reply = await generateSocietyAssistantReply({
      question: String(message).trim(),
      user,
      societyName: society.name,
      knowledgeDocs: docs,
      extraContext,
    });
    res.json(reply);
  });

  app.use('/api/v1', api);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SocietySync full-stack server running at http://localhost:${PORT}`);
  });
}

startServer();
