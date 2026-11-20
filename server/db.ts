import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditLog,
  Bill,
  Booking,
  Building,
  Complaint,
  Expense,
  Facility,
  Flat,
  KnowledgeDocument,
  Notice,
  NotificationItem,
  Payment,
  Role,
  Society,
  StaffMember,
  User,
  Vendor,
  VisitorRecord,
} from '../src/types';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseState {
  societies: Society[];
  users: StoredUser[];
  buildings: Building[];
  flats: Flat[];
  bills: Bill[];
  payments: Payment[];
  complaints: Complaint[];
  visitors: VisitorRecord[];
  notices: Notice[];
  facilities: Facility[];
  bookings: Booking[];
  expenses: Expense[];
  staff: StaffMember[];
  vendors: Vendor[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  knowledgeDocs: KnowledgeDocument[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'societysync-db.json');

export function hashPassword(password: string): string {
  const salt = 'societysync-salt-v1';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

export function createSeedState(): DatabaseState {
  const societyId = 'soc-green-valley';
  const now = new Date().toISOString();

  const buildings: Building[] = [
    { id: 'bld-a', societyId, name: 'Tower A — Banyan', code: 'A', floorsCount: 4 },
    { id: 'bld-b', societyId, name: 'Tower B — Gulmohar', code: 'B', floorsCount: 4 },
    { id: 'bld-c', societyId, name: 'Tower C — Neem', code: 'C', floorsCount: 4 },
  ];

  const users: StoredUser[] = [
    {
      id: 'usr-admin',
      email: 'admin@greenvalley.in',
      displayName: 'Ananya Deshmukh',
      phone: '+91 98201 11223',
      role: 'SOCIETY_ADMIN',
      societyId,
      status: 'ACTIVE',
      passwordHash: hashPassword('Admin@123'),
    },
    {
      id: 'usr-resident-1',
      email: 'resident@greenvalley.in',
      displayName: 'Rohan Sharma',
      phone: '+91 98202 33445',
      role: 'RESIDENT',
      societyId,
      flatId: 'flat-a-101',
      status: 'ACTIVE',
      passwordHash: hashPassword('Resident@123'),
    },
    {
      id: 'usr-resident-2',
      email: 'meera.iyer@greenvalley.in',
      displayName: 'Meera Iyer',
      phone: '+91 98203 55667',
      role: 'RESIDENT',
      societyId,
      flatId: 'flat-a-102',
      status: 'ACTIVE',
      passwordHash: hashPassword('Resident@123'),
    },
    {
      id: 'usr-committee',
      email: 'committee@greenvalley.in',
      displayName: 'Vikram Kulkarni',
      phone: '+91 98204 77889',
      role: 'COMMITTEE_MEMBER',
      societyId,
      flatId: 'flat-b-201',
      status: 'ACTIVE',
      passwordHash: hashPassword('Committee@123'),
    },
    {
      id: 'usr-security',
      email: 'security@greenvalley.in',
      displayName: 'Rajesh Yadav',
      phone: '+91 98205 99001',
      role: 'SECURITY',
      societyId,
      status: 'ACTIVE',
      passwordHash: hashPassword('Security@123'),
    },
    {
      id: 'usr-staff',
      email: 'staff@greenvalley.in',
      displayName: 'Suresh Patil',
      phone: '+91 98206 11224',
      role: 'MAINTENANCE_STAFF',
      societyId,
      status: 'ACTIVE',
      passwordHash: hashPassword('Staff@123'),
    },
  ];

  const residentNames = [
    'Rohan Sharma',
    'Meera Iyer',
    'Arjun Nair',
    'Priya Menon',
    'Karthik Reddy',
    'Sneha Joshi',
    'Vikram Kulkarni',
    'Neha Kapoor',
    'Amit Verma',
    'Divya Bhatia',
    'Siddharth Rao',
    'Kavita Shetty',
    'Nikhil Gupta',
    'Pooja Hegde',
    'Manish Tiwari',
    'Ritu Malhotra',
  ];

  const flats: Flat[] = [];
  let rIdx = 0;
  for (const b of buildings) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let u = 1; u <= 2; u++) {
        if (flats.length >= 20) break;
        const unitNumber = `${b.code}-${floor}0${u}`;
        const id = `flat-${b.code.toLowerCase()}-${floor}0${u}`;
        const isVacant = flats.length === 4 || flats.length === 11 || flats.length === 17;
        const isMaint = flats.length === 19;
        let residentName: string | undefined;
        let residentUserId: string | undefined;
        if (!isVacant && !isMaint) {
          if (id === 'flat-a-101') {
            residentName = 'Rohan Sharma';
            residentUserId = 'usr-resident-1';
          } else if (id === 'flat-a-102') {
            residentName = 'Meera Iyer';
            residentUserId = 'usr-resident-2';
          } else if (id === 'flat-b-201') {
            residentName = 'Vikram Kulkarni';
            residentUserId = 'usr-committee';
          } else {
            residentName = residentNames[rIdx % residentNames.length];
            rIdx++;
          }
        }
        flats.push({
          id,
          societyId,
          buildingId: b.id,
          buildingName: b.name,
          floorNumber: floor,
          unitNumber,
          flatType: u === 1 ? '3 BHK' : '2 BHK',
          areaSqft: u === 1 ? 1480 : 1120,
          occupancyStatus: isMaint ? 'UNDER_MAINTENANCE' : isVacant ? 'VACANT' : 'OCCUPIED',
          residentName,
          residentUserId,
        });
      }
    }
  }

  const bills: Bill[] = [
    {
      id: 'bill-001',
      societyId,
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      residentName: 'Rohan Sharma',
      billNumber: 'GVR-2026-11-001',
      billingPeriod: 'November 2026',
      issueDate: '2026-11-01',
      dueDate: '2026-11-28',
      items: [
        { description: 'Monthly Maintenance Charge (3 BHK)', amount: 4200 },
        { description: 'Water & STP Utility', amount: 650 },
        { description: 'Sinking & Reserve Fund', amount: 450 },
      ],
      subtotal: 5300,
      discount: 0,
      lateFee: 0,
      totalAmount: 5300,
      amountPaid: 0,
      status: 'ISSUED',
      version: 1,
      createdAt: '2026-11-01T06:00:00.000Z',
    },
    {
      id: 'bill-002',
      societyId,
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      residentName: 'Rohan Sharma',
      billNumber: 'GVR-2026-10-001',
      billingPeriod: 'October 2026',
      issueDate: '2026-10-01',
      dueDate: '2026-10-15',
      items: [
        { description: 'Monthly Maintenance Charge (3 BHK)', amount: 4200 },
        { description: 'Water & STP Utility', amount: 600 },
        { description: 'Sinking & Reserve Fund', amount: 450 },
      ],
      subtotal: 5250,
      discount: 0,
      lateFee: 0,
      totalAmount: 5250,
      amountPaid: 5250,
      status: 'PAID',
      version: 2,
      createdAt: '2026-10-01T06:00:00.000Z',
    },
    {
      id: 'bill-003',
      societyId,
      flatId: 'flat-a-102',
      flatLabel: 'A-102',
      residentName: 'Meera Iyer',
      billNumber: 'GVR-2026-11-002',
      billingPeriod: 'November 2026',
      issueDate: '2026-11-01',
      dueDate: '2026-11-10',
      items: [
        { description: 'Monthly Maintenance Charge (2 BHK)', amount: 3400 },
        { description: 'Water & STP Utility', amount: 550 },
        { description: 'Sinking & Reserve Fund', amount: 350 },
      ],
      subtotal: 4300,
      discount: 0,
      lateFee: 250,
      totalAmount: 4550,
      amountPaid: 2000,
      status: 'PARTIALLY_PAID',
      version: 2,
      createdAt: '2026-11-01T06:00:00.000Z',
    },
    {
      id: 'bill-004',
      societyId,
      flatId: 'flat-b-201',
      flatLabel: 'B-201',
      residentName: 'Vikram Kulkarni',
      billNumber: 'GVR-2026-11-003',
      billingPeriod: 'November 2026',
      issueDate: '2026-11-01',
      dueDate: '2026-11-10',
      items: [
        { description: 'Monthly Maintenance Charge (3 BHK)', amount: 4200 },
        { description: 'Water & STP Utility', amount: 650 },
      ],
      subtotal: 4850,
      discount: 0,
      lateFee: 250,
      totalAmount: 5100,
      amountPaid: 0,
      status: 'OVERDUE',
      version: 1,
      createdAt: '2026-11-01T06:00:00.000Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-001',
      societyId,
      billId: 'bill-002',
      billNumber: 'GVR-2026-10-001',
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      amount: 5250,
      method: 'UPI',
      transactionReference: 'UPI/429817263541',
      status: 'VERIFIED',
      receiptNumber: 'RCPT-2026-1001',
      submittedBy: 'Rohan Sharma',
      submittedAt: '2026-10-08T11:20:00.000Z',
      verifiedBy: 'Ananya Deshmukh',
      verifiedAt: '2026-10-08T15:10:00.000Z',
    },
    {
      id: 'pay-002',
      societyId,
      billId: 'bill-003',
      billNumber: 'GVR-2026-11-002',
      flatId: 'flat-a-102',
      flatLabel: 'A-102',
      amount: 2000,
      method: 'BANK_TRANSFER',
      transactionReference: 'NEFT/202611120089',
      status: 'VERIFIED',
      receiptNumber: 'RCPT-2026-1102',
      submittedBy: 'Meera Iyer',
      submittedAt: '2026-11-12T09:00:00.000Z',
      verifiedBy: 'Ananya Deshmukh',
      verifiedAt: '2026-11-12T12:30:00.000Z',
    },
    {
      id: 'pay-003',
      societyId,
      billId: 'bill-004',
      billNumber: 'GVR-2026-11-003',
      flatId: 'flat-b-201',
      flatLabel: 'B-201',
      amount: 5100,
      method: 'UPI',
      transactionReference: 'UPI/432198765432',
      status: 'PENDING_VERIFICATION',
      submittedBy: 'Vikram Kulkarni',
      submittedAt: '2026-11-19T14:15:00.000Z',
    },
  ];

  const complaints: Complaint[] = [
    {
      id: 'cmp-001',
      societyId,
      ticketNumber: 'SS-2026-000101',
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      createdBy: 'usr-resident-1',
      createdByName: 'Rohan Sharma',
      category: 'Plumbing',
      title: 'Low water pressure in master bathroom',
      description: 'Water pressure drops sharply every morning between 7:00 AM and 9:00 AM on the 1st floor.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedStaffId: 'usr-staff',
      assignedStaffName: 'Suresh Patil',
      slaDueAt: '2026-11-21T08:00:00.000Z',
      createdAt: '2026-11-19T06:30:00.000Z',
      events: [
        {
          id: 'ev-1',
          actorName: 'Rohan Sharma',
          actorRole: 'RESIDENT',
          eventType: 'CREATED',
          note: 'Ticket raised for low water pressure.',
          createdAt: '2026-11-19T06:30:00.000Z',
        },
        {
          id: 'ev-2',
          actorName: 'Ananya Deshmukh',
          actorRole: 'SOCIETY_ADMIN',
          eventType: 'ASSIGNED',
          note: 'Assigned to Suresh Patil (Plumbing & Utilities).',
          createdAt: '2026-11-19T07:15:00.000Z',
        },
        {
          id: 'ev-3',
          actorName: 'Suresh Patil',
          actorRole: 'MAINTENANCE_STAFF',
          eventType: 'IN_PROGRESS',
          note: 'Inspecting Tower A booster pump valve.',
          createdAt: '2026-11-19T09:00:00.000Z',
        },
      ],
    },
    {
      id: 'cmp-002',
      societyId,
      ticketNumber: 'SS-2026-000102',
      flatId: 'flat-a-102',
      flatLabel: 'A-102',
      createdBy: 'usr-resident-2',
      createdByName: 'Meera Iyer',
      category: 'Electrical',
      title: 'Corridor LED light flickering near elevator',
      description: 'The main hallway fixture outside A-102 flickers continuously after sunset.',
      priority: 'MEDIUM',
      status: 'OPEN',
      slaDueAt: '2026-11-21T16:00:00.000Z',
      createdAt: '2026-11-20T04:00:00.000Z',
      events: [
        {
          id: 'ev-4',
          actorName: 'Meera Iyer',
          actorRole: 'RESIDENT',
          eventType: 'CREATED',
          note: 'Reported flickering hallway LED.',
          createdAt: '2026-11-20T04:00:00.000Z',
        },
      ],
    },
  ];

  const visitors: VisitorRecord[] = [
    {
      id: 'vis-001',
      societyId,
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      invitedBy: 'usr-resident-1',
      invitedByName: 'Rohan Sharma',
      visitorName: 'Deepak Malhotra',
      phoneMasked: '******4821',
      purpose: 'Family Visit',
      visitStart: '2026-11-20T09:00:00.000Z',
      visitEnd: '2026-11-20T20:00:00.000Z',
      visitorCount: 2,
      vehicleNumber: 'MH-12-TR-4490',
      inviteCode: 'GVR-74921',
      isWalkIn: false,
      status: 'EXPECTED',
      createdAt: '2026-11-19T18:00:00.000Z',
    },
    {
      id: 'vis-002',
      societyId,
      flatId: 'flat-a-102',
      flatLabel: 'A-102',
      invitedBy: 'usr-resident-2',
      invitedByName: 'Meera Iyer',
      visitorName: 'UrbanClap AC Technician',
      phoneMasked: '******9102',
      purpose: 'Appliance Service',
      visitStart: '2026-11-20T08:00:00.000Z',
      visitEnd: '2026-11-20T13:00:00.000Z',
      visitorCount: 1,
      inviteCode: 'GVR-31084',
      isWalkIn: false,
      status: 'CHECKED_IN',
      checkedInAt: '2026-11-20T08:45:00.000Z',
      checkedInBy: 'Rajesh Yadav',
      createdAt: '2026-11-19T20:00:00.000Z',
    },
  ];

  const notices: Notice[] = [
    {
      id: 'not-001',
      societyId,
      title: 'Scheduled Overhead Water Tank Cleaning — Tower A & B',
      body: 'Annual overhead tank sanitization will take place on Sunday, 22 November 2026 from 10:00 AM to 2:00 PM. Please store sufficient water in advance. Emergency tanker supply is arranged near Gate 2.',
      category: 'Maintenance',
      priority: 'URGENT',
      audience: 'All Residents',
      status: 'PUBLISHED',
      pinned: true,
      publishedAt: '2026-11-18T09:00:00.000Z',
      createdByName: 'Ananya Deshmukh',
      readByUserIds: ['usr-admin'],
    },
    {
      id: 'not-002',
      societyId,
      title: 'Annual General Body Meeting (AGM) — Q4 Financial Review',
      body: 'All flat owners are invited to attend the Q4 AGM at the Clubhouse Multipurpose Hall on Saturday, 28 November 2026 at 5:30 PM. Agenda includes FY26-27 maintenance budget and solar rooftop proposal.',
      category: 'Governance',
      priority: 'IMPORTANT',
      audience: 'All Residents',
      status: 'PUBLISHED',
      pinned: false,
      publishedAt: '2026-11-15T11:30:00.000Z',
      createdByName: 'Vikram Kulkarni',
      readByUserIds: ['usr-admin', 'usr-resident-1'],
    },
  ];

  const facilities: Facility[] = [
    {
      id: 'fac-clubhouse',
      societyId,
      name: 'Clubhouse Multipurpose Hall',
      description: 'Air-conditioned event hall with seating for 80 guests and catering pantry.',
      location: 'Central Podium, Level 1',
      capacity: 80,
      fee: 2500,
      approvalRequired: true,
      openingTime: '08:00',
      closingTime: '22:00',
      rules: 'No loud music after 10:00 PM. Refundable security deposit ₹2,000 payable at office.',
      active: true,
    },
    {
      id: 'fac-gym',
      societyId,
      name: 'Fitness Studio & Gym',
      description: 'Cardio, free weights, and stretching zone exclusively for residents.',
      location: 'Central Podium, Level 2',
      capacity: 15,
      fee: 0,
      approvalRequired: false,
      openingTime: '06:00',
      closingTime: '21:30',
      rules: 'Non-marking indoor shoes and personal towel mandatory.',
      active: true,
    },
    {
      id: 'fac-badminton',
      societyId,
      name: 'Indoor Badminton Court',
      description: 'Wooden-floor regulation badminton court with LED anti-glare lighting.',
      location: 'Sports Annex, Ground Floor',
      capacity: 4,
      fee: 200,
      approvalRequired: false,
      openingTime: '06:00',
      closingTime: '22:00',
      rules: 'Maximum 2 hours per flat per week. Non-marking shoes required.',
      active: true,
    },
  ];

  const bookings: Booking[] = [
    {
      id: 'bkg-001',
      societyId,
      facilityId: 'fac-clubhouse',
      facilityName: 'Clubhouse Multipurpose Hall',
      flatId: 'flat-a-102',
      flatLabel: 'A-102',
      bookedBy: 'usr-resident-2',
      bookedByName: 'Meera Iyer',
      startAt: '2026-11-22T17:00:00.000Z',
      endAt: '2026-11-22T20:00:00.000Z',
      attendeeCount: 35,
      fee: 2500,
      status: 'CONFIRMED',
      createdAt: '2026-11-17T10:00:00.000Z',
    },
    {
      id: 'bkg-002',
      societyId,
      facilityId: 'fac-badminton',
      facilityName: 'Indoor Badminton Court',
      flatId: 'flat-a-101',
      flatLabel: 'A-101',
      bookedBy: 'usr-resident-1',
      bookedByName: 'Rohan Sharma',
      startAt: '2026-11-21T18:00:00.000Z',
      endAt: '2026-11-21T19:00:00.000Z',
      attendeeCount: 4,
      fee: 200,
      status: 'CONFIRMED',
      createdAt: '2026-11-19T12:00:00.000Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-001',
      societyId,
      category: 'Security Services',
      vendorName: 'ShieldGuard Facilities Pvt Ltd',
      title: 'Monthly Security Guard Retainer — Oct 2026',
      description: '12 guards across 3 shifts covering Main Gate, Gate 2, and Tower patrols.',
      amount: 148000,
      expenseDate: '2026-11-02',
      status: 'PAID',
      submittedByName: 'Ananya Deshmukh',
      approvedByName: 'Vikram Kulkarni',
      createdAt: '2026-11-02T09:00:00.000Z',
    },
    {
      id: 'exp-002',
      societyId,
      category: 'Elevator AMC',
      vendorName: 'KONE Elevators India',
      title: 'Quarterly Lift Preventive Maintenance',
      description: 'Preventive servicing and safety sensor calibration for 6 passenger lifts.',
      amount: 42500,
      expenseDate: '2026-11-14',
      status: 'SUBMITTED',
      submittedByName: 'Ananya Deshmukh',
      createdAt: '2026-11-14T11:00:00.000Z',
    },
    {
      id: 'exp-003',
      societyId,
      category: 'Landscaping',
      vendorName: 'GreenThumb Nurseries',
      title: 'Podium Garden Seasonal Pruning & Fertilizer',
      description: 'Lawn aeration, hedge trimming, and organic compost application.',
      amount: 18500,
      expenseDate: '2026-11-10',
      status: 'APPROVED',
      submittedByName: 'Ananya Deshmukh',
      approvedByName: 'Vikram Kulkarni',
      createdAt: '2026-11-10T10:30:00.000Z',
    },
  ];

  const staff: StaffMember[] = [
    {
      id: 'stf-001',
      societyId,
      userId: 'usr-staff',
      name: 'Suresh Patil',
      phone: '+91 98206 11224',
      jobTitle: 'Senior Plumbing & Utility Technician',
      skills: 'Plumbing, Booster Pumps, STP',
      active: true,
    },
    {
      id: 'stf-002',
      societyId,
      name: 'Mahesh Kadam',
      phone: '+91 98207 44556',
      jobTitle: 'Electrical Technician',
      skills: 'DG Set, Common Lighting, Intercom',
      active: true,
    },
  ];

  const vendors: Vendor[] = [
    {
      id: 'vnd-001',
      societyId,
      name: 'ShieldGuard Facilities Pvt Ltd',
      serviceType: 'Security & Gate Operations',
      contactName: 'Prakash Nair',
      phone: '+91 98111 22334',
      contractEnd: '2027-03-31',
      active: true,
    },
    {
      id: 'vnd-002',
      societyId,
      name: 'KONE Elevators India',
      serviceType: 'Elevator AMC',
      contactName: 'Ramesh Iyer',
      phone: '+91 98112 55667',
      contractEnd: '2027-06-30',
      active: true,
    },
  ];

  const knowledgeDocs: KnowledgeDocument[] = [
    {
      id: 'kb-001',
      societyId,
      title: 'Clubhouse & Amenity Booking Policy',
      category: 'Facilities',
      content:
        'Residents may book the Clubhouse Multipurpose Hall (₹2,500/slot, admin approval required), Indoor Badminton Court (₹200/hr, max 2 hrs/week), and Fitness Studio (free) through the Facilities & Booking module. Cancellations made 24 hours in advance receive a full refund. Quiet hours begin strictly at 10:00 PM.',
      approved: true,
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'kb-002',
      societyId,
      title: 'Maintenance Billing & Late Fee Guidelines',
      category: 'Billing',
      content:
        'Monthly maintenance bills are issued on the 1st of every month and are due by the 15th. Payments may be submitted via UPI, Bank Transfer (NEFT/IMPS), Cheque, or Cash at the society office. Offline payment references are verified by the Society Admin within 2 business days. A flat late fee of ₹250 applies after the due date. Partial payments are permitted.',
      approved: true,
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'kb-003',
      societyId,
      title: 'Visitor & Gate Security Protocol',
      category: 'Security',
      content:
        'Residents can pre-approve guests and delivery/service personnel in the Visitors module to generate a single-use invite code (e.g., GVR-XXXXX). Walk-in visitors without an invite code require explicit resident approval from the gate before entry is permitted. All visitors must check out at the gate upon departure.',
      approved: true,
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'kb-004',
      societyId,
      title: 'Complaint SLA & Escalation Matrix',
      category: 'Complaints',
      content:
        'Service complaints are assigned SLA targets by priority: Urgent (4 hours), High (12 hours), Medium (24 hours), Low (72 hours). Once maintenance staff marks a ticket Resolved, residents have 7 days to confirm closure or reopen the ticket if the issue persists.',
      approved: true,
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'ntf-001',
      societyId,
      userId: 'usr-admin',
      type: 'PAYMENT_SUBMITTED',
      title: 'Payment pending verification',
      body: 'Vikram Kulkarni (B-201) submitted ₹5,100 via UPI for bill GVR-2026-11-003.',
      read: false,
      createdAt: '2026-11-19T14:16:00.000Z',
    },
    {
      id: 'ntf-002',
      societyId,
      userId: 'usr-resident-1',
      type: 'BILL_ISSUED',
      title: 'November 2026 maintenance bill issued',
      body: 'Bill GVR-2026-11-001 for ₹5,300 is due on 28 Nov 2026.',
      read: false,
      createdAt: '2026-11-01T06:05:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-001',
      societyId,
      actorName: 'Ananya Deshmukh',
      actorRole: 'SOCIETY_ADMIN',
      action: 'BILL_ISSUED',
      entityType: 'BILL',
      entityId: 'bill-001',
      details: 'Issued November 2026 maintenance bill GVR-2026-11-001 for A-101 (₹5,300).',
      requestId: 'req-seed-001',
      createdAt: '2026-11-01T06:00:00.000Z',
    },
    {
      id: 'aud-002',
      societyId,
      actorName: 'Ananya Deshmukh',
      actorRole: 'SOCIETY_ADMIN',
      action: 'PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: 'pay-002',
      details: 'Verified NEFT payment of ₹2,000 for A-102 (Receipt RCPT-2026-1102).',
      requestId: 'req-seed-002',
      createdAt: '2026-11-12T12:30:00.000Z',
    },
  ];

  return {
    societies: [
      {
        id: societyId,
        name: 'Green Valley Residency',
        slug: 'green-valley-residency',
        address: 'Plot 42, Baner-Pashan Link Road',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411045',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        contactEmail: 'office@greenvalley.in',
        contactPhone: '+91 20 2729 4400',
        lateFeeAmount: 250,
        allowPartialPayments: true,
        allowOverpayment: false,
        reopenWindowDays: 7,
      },
    ],
    users,
    buildings,
    flats,
    bills,
    payments,
    complaints,
    visitors,
    notices,
    facilities,
    bookings,
    expenses,
    staff,
    vendors,
    notifications,
    auditLogs,
    knowledgeDocs,
  };
}

let cachedState: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedState) return cachedState;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      cachedState = JSON.parse(raw) as DatabaseState;
      return cachedState;
    }
  } catch {
    // Fall back to fresh seed if corrupted
  }
  cachedState = createSeedState();
  saveDb(cachedState);
  return cachedState;
}

export function saveDb(state: DatabaseState): void {
  cachedState = state;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

export function resetDb(): DatabaseState {
  const fresh = createSeedState();
  saveDb(fresh);
  return fresh;
}

export function appendAudit(
  db: DatabaseState,
  params: {
    societyId: string;
    actorName: string;
    actorRole: Role;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
  }
): void {
  db.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    societyId: params.societyId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    requestId: `req-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  });
}
