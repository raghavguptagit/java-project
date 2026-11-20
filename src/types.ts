export type Role =
  | 'PLATFORM_ADMIN'
  | 'SOCIETY_ADMIN'
  | 'COMMITTEE_MEMBER'
  | 'RESIDENT'
  | 'SECURITY'
  | 'MAINTENANCE_STAFF';

export type OccupancyStatus = 'OCCUPIED' | 'VACANT' | 'UNDER_MAINTENANCE';
export type BillStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
export type PaymentMethod = 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type VisitorStatus = 'EXPECTED' | 'AWAITING_APPROVAL' | 'APPROVED' | 'DENIED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REVOKED' | 'EXPIRED';
export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface Society {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  timezone: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  lateFeeAmount: number;
  allowPartialPayments: boolean;
  allowOverpayment: boolean;
  reopenWindowDays: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: Role;
  societyId: string;
  flatId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Building {
  id: string;
  societyId: string;
  name: string;
  code: string;
  floorsCount: number;
}

export interface Flat {
  id: string;
  societyId: string;
  buildingId: string;
  buildingName: string;
  floorNumber: number;
  unitNumber: string;
  flatType: string;
  areaSqft: number;
  occupancyStatus: OccupancyStatus;
  residentName?: string;
  residentUserId?: string;
}

export interface BillLineItem {
  description: string;
  amount: number;
}

export interface Bill {
  id: string;
  societyId: string;
  flatId: string;
  flatLabel: string;
  residentName: string;
  billNumber: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  items: BillLineItem[];
  subtotal: number;
  discount: number;
  lateFee: number;
  totalAmount: number;
  amountPaid: number;
  status: BillStatus;
  notes?: string;
  version: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  societyId: string;
  billId: string;
  billNumber: string;
  flatId: string;
  flatLabel: string;
  amount: number;
  method: PaymentMethod;
  transactionReference: string;
  status: PaymentStatus;
  receiptNumber?: string;
  rejectionReason?: string;
  submittedBy: string;
  submittedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  idempotencyKey?: string;
}

export interface ComplaintEvent {
  id: string;
  actorName: string;
  actorRole: Role;
  eventType: string;
  note: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  societyId: string;
  ticketNumber: string;
  flatId: string;
  flatLabel: string;
  createdBy: string;
  createdByName: string;
  category: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  slaDueAt: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  events: ComplaintEvent[];
}

export interface VisitorRecord {
  id: string;
  societyId: string;
  flatId: string;
  flatLabel: string;
  invitedBy: string;
  invitedByName: string;
  visitorName: string;
  phoneMasked?: string;
  purpose: string;
  visitStart: string;
  visitEnd: string;
  visitorCount: number;
  vehicleNumber?: string;
  inviteCode: string;
  isWalkIn: boolean;
  status: VisitorStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  checkedInBy?: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  societyId: string;
  title: string;
  body: string;
  category: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  audience: string;
  status: NoticeStatus;
  pinned: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdByName: string;
  readByUserIds: string[];
}

export interface Facility {
  id: string;
  societyId: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  fee: number;
  approvalRequired: boolean;
  openingTime: string;
  closingTime: string;
  rules: string;
  active: boolean;
}

export interface Booking {
  id: string;
  societyId: string;
  facilityId: string;
  facilityName: string;
  flatId: string;
  flatLabel: string;
  bookedBy: string;
  bookedByName: string;
  startAt: string;
  endAt: string;
  attendeeCount: number;
  fee: number;
  status: BookingStatus;
  cancellationReason?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  societyId: string;
  category: string;
  vendorName: string;
  title: string;
  description: string;
  amount: number;
  expenseDate: string;
  status: ExpenseStatus;
  submittedByName: string;
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  societyId: string;
  userId?: string;
  name: string;
  phone: string;
  jobTitle: string;
  skills: string;
  active: boolean;
}

export interface Vendor {
  id: string;
  societyId: string;
  name: string;
  serviceType: string;
  contactName: string;
  phone: string;
  contractEnd?: string;
  active: boolean;
}

export interface NotificationItem {
  id: string;
  societyId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  societyId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  requestId: string;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  societyId: string;
  title: string;
  category: string;
  content: string;
  approved: boolean;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; category: string }[];
  provider: 'gemini' | 'fallback';
  createdAt: string;
}
