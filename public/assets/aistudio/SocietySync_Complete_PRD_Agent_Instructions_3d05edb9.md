# SocietySync — Complete Product Requirements & AI Coding Agent Build Specification
Version: 1.0 | Project type: Final-year Java Full Stack | Build target: production-style MVP

> **Agent rule:** This document is the source of truth. Implement the system in working increments. Do not skip features, fake functionality, leave TODO buttons, hardcode demo data into production screens, or claim completion without running tests and verifying flows. If an external service credential is unavailable, implement a safe configurable integration, clearly label it as unavailable in local setup, and provide a working mock/dev adapter that does not pretend real transactions occurred.

---

## 1. Product Overview

**SocietySync** is a web-based residential community management platform for apartment societies, gated communities, and housing complexes. It brings residents, society administrators, security personnel, maintenance staff, committee members, and vendors into one system.

The platform should make everyday society operations transparent and traceable:
- Maintenance dues, bills, receipts and payment tracking
- Complaints and service requests with assignment, status history, SLA tracking and comments
- Visitor pre-approval and gate check-in/check-out
- Notices and announcements
- Amenities/facilities booking with conflict prevention
- Resident, household, apartment and staff directory
- Expense/income ledger and reports
- Vendor and staff work management
- AI-powered Society Assistant using **Google Gemini** for grounded FAQ/help, notice drafting and summarization (never for financial decisions or permissions)

**Product name:** SocietySync  
**Tagline:** Your community. Connected. Transparent.  
**Primary goal:** A polished, secure, reliable, responsive society operations product suitable for a final-year project demo and portfolio.

---

## 2. Scope, Constraints & Build Principles

### 2.1 Must-haves
1. All essential screens and workflows are genuinely functional.
2. Every operation is authorized server-side; UI hiding alone is not security.
3. Tenant isolation: a user can access only their own society's records unless explicitly granted a platform role.
4. Validate all input server-side and client-side.
5. Use database transactions for financial records, booking conflicts, and other multi-step updates.
6. Handle loading, empty, error, success, and disabled states.
7. No dead links, inert buttons, fake charts, or unexplained placeholder content.
8. Seed data is for development/demo only and must not be mixed with production records.
9. Do not expose secrets in source code, logs, browser bundles, or Git.
10. Build and test in phases; maintain a `BUILD_STATUS.md` and update it honestly.
11. Avoid unnecessary rewrites and avoid adding dependencies without a reason.
12. Use accessible labels, keyboard navigation, sensible contrast and responsive layouts.
13. Store timestamps consistently (UTC in DB; display in configured society timezone, default `Asia/Kolkata`).
14. Currency defaults to INR (`₹`); format using `en-IN`.
15. UI text should be clear, polished English. Structure should support localization later.
16. AI output is advisory; verify and display the relevant source context when answering society-policy questions.

### 2.2 MVP vs later enhancements
**MVP required:** authentication, role-based access, society/flat/resident setup, maintenance billing and payment recording, complaint lifecycle, visitor management, notices, amenity booking, dashboard, reports, audit log, Gemini assistant, responsive UI, tests, Docker/local setup.

**Stretch features (only after MVP works):** real payment gateway, WhatsApp/SMS, live gate camera/face recognition (not included), mobile push notifications, multi-language, advanced accounting, predictive analytics.

---

## 3. User Roles & Permissions

Use role-based access control (RBAC), plus society membership checks.

### Roles
- `PLATFORM_ADMIN`: manages platform-level societies and system configuration; cannot casually view residents' sensitive data.
- `SOCIETY_ADMIN`: full operations for assigned society; user/flat setup, bills, complaints, notices, facilities, vendors, reports, settings.
- `COMMITTEE_MEMBER`: read operational dashboard and reports; may approve selected expenses/announcements if configured; no user/password administration.
- `RESIDENT`: own household/flat scope; view bills, receipts, own complaints, own visitors, notices, book amenities, profile.
- `SECURITY`: gate visitor workflow; can see today's expected visitors and limited resident/flat details needed to verify entry; no finance/complaints access.
- `MAINTENANCE_STAFF`: assigned work orders and limited task details; update progress, notes, completion proof.
- `ACCOUNTANT` (optional role): finance/bills/payments/expenses/reports, no security or account administration.
- `VENDOR` (optional MVP if time): vendor profile and assigned work only.

### Permission rules
- Every request must check authentication, role and `society_id`.
- A resident must not query another flat's bills, visitors, complaints, or household members.
- Security can create visitor check-ins and check-outs, and see approved visitor data only.
- Staff see assigned tasks, not all residents' private records.
- Society admins can manage only their society.
- Platform admins use explicit platform endpoints and audit their actions.
- Never accept role, society ID, flat ID, payment status, amount, or ownership blindly from client input. Verify against server/database.
- Apply deny-by-default policy.

---

## 4. Core User Journeys

### 4.1 First-time society setup
1. Platform admin creates society, or dev/demo bootstrap creates one.
2. Society admin logs in.
3. Admin configures society name, address, timezone, currency, billing cycle, late fee policy, payment instructions, facilities, complaint categories, and staff.
4. Admin creates/imports buildings, floors and flats.
5. Admin invites residents or creates accounts; account activation/reset flow.
6. Dashboard shows onboarding checklist and setup progress.

### 4.2 Resident onboarding
1. Resident receives invite/registration token or admin-created account.
2. Sets password; system validates password policy.
3. Completes profile and household members (only authorized fields).
4. Sees assigned flat, current dues, notices, facilities and complaint history.
5. Resident can update permitted profile fields; changes to flat/role require admin.

### 4.3 Maintenance bill & payment
1. Admin creates monthly/one-time bill for one flat, selected flats, or all flats.
2. Bill lines show description, base charge, discounts, late fee, due date and total.
3. Resident views bill and downloads printable receipt/invoice.
4. Resident submits payment proof/transaction reference if payment mode is offline; payment remains `PENDING_VERIFICATION`.
5. Accountant/admin verifies/rejects with reason.
6. Verified payment updates outstanding balance atomically and creates receipt.
7. Admin can record cash/cheque/UPI/manual payment; audit entry mandatory.
8. Duplicate payment reference should be detected where applicable.
9. Partial payments allowed if society setting enables it; otherwise reject.
10. Overpayment policy configurable; default reject.
11. Bill statuses derive correctly: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`. Never allow editing an issued bill's financial lines without a credit/debit adjustment or cancellation/reissue workflow.

### 4.4 Complaint workflow
1. Resident creates complaint with category, title, details, priority, optional photo(s), location/flat and preferred contact.
2. System generates unique ticket number.
3. Admin triages, assigns staff, sets priority and SLA.
4. Staff acknowledges, updates `IN_PROGRESS`, adds note/photo, marks `RESOLVED`.
5. Resident confirms resolution or reopens within configurable period.
6. Admin closes or reassigns; all changes logged in timeline.
7. SLA overdue indicator and reminders are generated.
8. Residents see only their own complaint; admins see society complaints; staff see assigned complaints.

### 4.5 Visitor management
1. Resident pre-approves visitor with name, phone (optional), visit date/time window, purpose, count and vehicle details.
2. System creates invitation code/QR with random non-guessable token, expiry and revocation.
3. Security searches/scans invitation or records walk-in request.
4. Security verifies visitor details and contacts resident when needed.
5. Check-in records security user, timestamp and status; check-out likewise.
6. Admin/resident can view visitor log within their permission.
7. QR/token must not expose resident private data; token lookup rate-limited.
8. Walk-in visitor: security requests resident approval; status `AWAITING_APPROVAL`, `APPROVED`, `DENIED`, `CHECKED_IN`, `CHECKED_OUT`, `EXPIRED`, `CANCELLED`.

### 4.6 Notice & announcement
1. Admin/committee drafts notice with title, body, category, audience, attachments, publish time and optional expiry.
2. Draft preview; publish.
3. Residents see relevant notices, can mark read.
4. Important notice can be pinned.
5. Track read statistics by aggregate only; don't expose individual read status unnecessarily.
6. Gemini may help draft/summarize but user must review and publish.

### 4.7 Amenity booking
1. Admin configures facility, capacity, operating hours, booking duration, buffer, fees, blackout dates and rules.
2. Resident selects slot/date and agrees to rules.
3. Backend checks availability inside transaction; overlapping booking is rejected.
4. Booking states: `REQUESTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`.
5. Admin approval required only for configured facilities.
6. Cancellation policy and refundable fee settings apply.
7. Admin views calendar and booking utilization.

### 4.8 Expense & transparent ledger
1. Authorized admin/accountant records expense: category, vendor, amount, date, description, invoice attachment, payment method.
2. Approval flow configurable: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PAID`.
3. Committee sees read-only reports and approval queue according to permissions.
4. Resident-facing transparency page shows only approved aggregate expenses and society-defined disclosure fields; no confidential vendor bank data.
5. Ledger entries are immutable after posting; correction via reversal/adjustment entry.

---

## 5. Functional Requirements

### Module A — Authentication & Account
- Login with email/username and password.
- Invite-based account activation.
- Forgot/reset password with expiring, single-use token.
- Logout, session/token refresh strategy.
- Password hashing with BCrypt/Argon2 supported by Spring Security (use BCrypt default unless configured).
- Rate-limit login and password-reset requests.
- Account lockout/backoff after repeated failed logins.
- Optional email verification.
- Profile view/edit allowed fields.
- Admin deactivate/reactivate users.
- No public self-signup that grants society membership/role without invite/approval.
- Secure error messages that do not reveal whether account exists.

### Module B — Dashboard
Role-specific dashboards:
- Resident: outstanding dues, next due date, complaint status, next booking, visitor expected, unread notices.
- Society admin: collection this month, outstanding, complaints by status/priority, visitor activity, bookings, expense summary, occupancy.
- Committee: financial overview, approvals, society operational KPIs.
- Security: expected visitors, current checked-in visitors, walk-ins waiting approval.
- Maintenance staff: assigned work, due/overdue, recent updates.
- Use real backend data, date-range filters, accessible charts and links to detail views.
- Charts must not use hardcoded demo values.

### Module C — Society / Building / Flat Management
- Society settings and profile.
- Buildings/towers, floors and flat/unit numbers.
- Flat types and occupancy status (`VACANT`, `OCCUPIED`, `UNDER_MAINTENANCE`).
- Owner/tenant household association and validity dates.
- Resident-to-flat relationships (primary resident, owner, tenant, family member).
- Admin import via CSV with preview, validation, error report and safe rollback.
- Search/filter/pagination.
- Prevent duplicate unit number within building.
- Maintain history for changes to occupant assignment.

### Module D — Maintenance Billing
- Billing templates and recurring billing cycles.
- Bill generation for selected/all flats.
- Line items, tax (optional configurable), late fee rule, due date.
- Bill number unique within society.
- Bill list filters: date, status, flat, resident, amount range.
- Bill details, PDF/print view.
- Payment recording and verification workflow.
- Payment receipt PDF/print.
- Payment proof upload with secure file handling.
- Reconciliation report.
- Outstanding report and aging buckets: 0–30, 31–60, 61–90, 90+ days.
- Bill cancellation and adjustment audit.
- Reminder scheduler configurable (in-app/email adapter).
- All money stored as decimal with fixed precision; never float/double.

### Module E — Complaints & Work Orders
- Configurable categories.
- Create/update/comment/attachment.
- Ticket number format, e.g. `SS-2026-000123`.
- Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Status lifecycle with legal transition rules.
- Staff assignment and reassignment.
- SLA configuration per category/priority.
- Timeline of status/assignment/comments.
- Resolution confirmation/reopen rules.
- Admin reports and export.
- Notification events.

### Module F — Visitors & Gate
- Resident visitor invitations.
- Invitation token and optional QR code.
- Security gate search/check-in/check-out.
- Walk-in approval workflow.
- Vehicle details and visitor count.
- Daily log, filter, export.
- Revoke invitations.
- Privacy: mask phone for roles without need.
- Token expiry and audit trail.

### Module G — Notices & Communications
- Notice CRUD and draft/publish/schedule.
- Audience targeting: all residents, building, selected flats, committee, staff.
- Category, priority, attachments, pinned, expiry.
- Read/acknowledgement options for important notices.
- Search/archive.
- In-app notification center.

### Module H — Facilities & Booking
- Facility setup and rules.
- Slot calendar.
- Booking conflict detection.
- Admin approval options.
- Fees and payment status (if configured).
- Cancellation rules.
- Blackout dates and maintenance blocks.
- Booking history and utilization.

### Module I — Staff & Vendors
- Staff profiles, skills, contact, shift (optional).
- Work assignment.
- Vendor directory, services, contact, contract dates.
- Vendor work order linkage.
- Restricted data access.
- Staff attendance is stretch scope.

### Module J — Expenses & Reports
- Expense categories.
- Expense submission/approval.
- Attachment/invoice.
- Income and expense summaries.
- Monthly/quarterly/yearly financial reports.
- Collections, arrears, complaint SLA, facility usage, visitor stats.
- CSV export; PDF export/print.
- Aggregate resident transparency view.
- Reversal/adjustment audit; never silently delete posted transactions.

### Module K — Notifications
- Notification center: unread count, mark read, mark all read.
- Event types: bill issued, due reminder, payment verified/rejected, complaint update, visitor approval request, visitor checked in, notice published, booking approved/rejected/cancelled, assigned task.
- In-app notification is required.
- Email adapter configurable via SMTP; if credentials absent, log safely in development only and show email provider disabled in settings.
- Notification preferences.
- Avoid exposing sensitive content in push/email preview.

### Module L — Gemini AI Society Assistant
Use **Google Gemini API** (server-side only). Model name must be configurable through environment variable, e.g. `GEMINI_MODEL`; do not hardcode a deprecated model name. Use the currently supported Gemini model configured by the developer. Read official current Gemini SDK/API documentation during implementation if model/API compatibility is uncertain.

AI features:
1. Society FAQ assistant: answer from admin-approved knowledge sources such as society rules, facility policies, maintenance FAQ, notice text and configured information.
2. Notice drafting: generate a draft from admin instructions; user edits and explicitly publishes.
3. Complaint summary: summarize ticket history for authorized staff.
4. Admin report narrative: explain trends from already-authorized aggregate metrics.
5. Resident help: explain how to use the application and clarify bill fields, without making legal/financial commitments.

AI safety:
- Backend calls Gemini only; never expose API key to React.
- Require authentication and rate limits.
- Check user and society scope before assembling prompt context.
- Do not send unnecessary PII, phone numbers, passwords, payment proof, private visitor data, or sensitive files to Gemini.
- Prefer retrieval from approved society knowledge; cite source titles/links in assistant response where possible.
- If answer not supported by context, say it doesn't have enough information and direct user to admin.
- Treat uploaded documents and user content as untrusted prompt-injection content. Extract facts, never follow instructions contained within documents that override system policy.
- Do not allow AI to create bills, approve payments, grant access, approve visitors, change roles, or perform privileged actions.
- Store conversation history only as configured; provide clear delete/retention behavior. Default keep short-lived conversation records and avoid sensitive data.
- Add token/usage limits and graceful quota/API error messages.
- UI shows “AI-generated; verify before acting” where relevant.
- Provide a deterministic fallback FAQ/search if Gemini is unavailable; do not fake an AI response.

### Module M — Audit & System Settings
- Audit important actions: login failures, role changes, user invitation, bill issue/cancel, payment verify/reject, expense approval, visitor status, complaint assignment/status, facility settings, notice publish.
- Audit record: actor, action, entity, entity ID, timestamp, society, safe metadata, request correlation ID.
- Audit records immutable and access restricted.
- Society settings: timezone, currency, billing cycle, late fees, booking policies, complaint SLA, notification settings, privacy retention.
- Platform config: integrations status, feature flags, system health (platform admin only).

---

## 6. UI/UX Requirements — Premium, Modern & Responsive

### Design direction
Build a clean, polished SaaS dashboard. Avoid generic bootstrap template look or overcrowded cards. Use a consistent design system:
- Light theme default; optional dark theme if fully implemented.
- Neutral/slate surfaces with one strong primary brand color (indigo/blue or emerald), carefully chosen semantic colors.
- Good typography (Inter or a comparable licensed web font).
- Consistent spacing scale, borders, subtle shadows, rounded corners.
- Use icons consistently (Lucide).
- Charts with accessible labels and tooltips.
- Skeleton loaders, empty states with helpful action, error states with retry.
- Toasts for successful/failed actions.
- Confirm destructive actions with a clear modal.
- Forms with inline validation, labels, helpful text and error messages.
- No horizontal page overflow at 320px viewport width.
- Responsive navigation: desktop sidebar; mobile drawer/bottom navigation where appropriate.
- Tables become mobile-friendly cards or controlled horizontal scroll with clear indication.
- Touch target ~44px minimum.
- Respect reduced motion preference.
- Keyboard accessible; focus rings; semantic HTML.
- Never use alerts as the primary polished UX. Use modal/toast.

### Layout
**Desktop:** left sidebar, top bar (society selector if multiple, global search, notification bell, profile menu), content with breadcrumbs and page title.
**Mobile:** compact header, slide-out nav, stacked cards, sticky primary action when appropriate, filters in a sheet/drawer.

### Required pages
1. Login
2. Forgot/reset password
3. Invitation activation
4. Onboarding wizard
5. Resident dashboard
6. Admin dashboard
7. Committee dashboard
8. Security dashboard
9. Staff dashboard
10. Flats/buildings list and details
11. Residents list and resident profile
12. Maintenance bills list/detail/create/generate
13. Payment submission/detail/verification
14. Complaints list/create/detail/timeline
15. Work assignments
16. Visitor invitation/create/list/detail
17. Gate check-in/out screen
18. Notices list/detail/create/edit
19. Facility list/detail/configuration
20. Booking calendar/list/create/detail
21. Staff and vendor directory
22. Expenses list/create/detail/approval
23. Reports and export
24. Notifications
25. AI Assistant (chat + context/source display)
26. Profile/security settings
27. Society settings
28. Audit log
29. Platform admin societies/users (if platform role implemented)
30. 403/404/500 error pages

### UX detail
- Global search should search only entities permitted to the logged-in role.
- Lists support pagination, sorting, filters, query-string persistence and clear filters.
- Detail pages use tabs where helpful and include activity timeline.
- Use optimistic UI only when rollback is correct; otherwise wait for server response.
- All forms protect against accidental double submission.
- Save draft where long form is appropriate.
- Confirm file uploads, show progress and size/type restrictions.
- Every button/link has a real action and permission-aware visibility.

---

## 7. Technology & Architecture

### Recommended versions
- Java 21 LTS
- Spring Boot 3.x (choose latest stable compatible release at project start)
- Maven
- Spring Web
- Spring Security
- Spring Data JPA
- Bean Validation
- MySQL 8+
- React + TypeScript (Vite)
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form + Zod
- Chart library (Recharts or Chart.js)
- Lucide icons
- OpenAPI/Swagger
- Flyway migrations
- JUnit 5, Mockito, Testcontainers (where available)
- Docker and Docker Compose

Use exact compatible versions and commit lockfiles. Do not upgrade versions mid-project without tests.

### Backend architecture
Use modular monolith (not microservices) for maintainability:
- `auth`
- `society`
- `users`
- `residents`
- `flats`
- `billing`
- `payments`
- `complaints`
- `visitors`
- `notices`
- `facilities`
- `bookings`
- `staff`
- `vendors`
- `expenses`
- `notifications`
- `reports`
- `ai`
- `audit`
- `common`

Each module should have controller, service, repository, DTO, mapper (where appropriate), domain/entity and validation. Controllers must not contain business logic. Use DTOs; never expose JPA entities directly.

### API conventions
- Prefix: `/api/v1`
- JSON responses.
- Pagination: `page`, `size`, `sort`.
- Consistent error response using RFC 7807 Problem Details or a documented custom envelope.
- Validation errors include field and safe message.
- Correlation/request ID.
- OpenAPI docs.
- Idempotency key for important payment operations if appropriate.
- Use optimistic locking (`@Version`) on conflict-prone records.
- API endpoints must be documented and tested.

### Security
- Spring Security.
- JWT access token short-lived and refresh mechanism; choose secure storage strategy. Prefer HttpOnly Secure SameSite cookies for refresh token; protect against CSRF if cookies used. Avoid localStorage for long-lived secrets.
- Password hash.
- CORS strict allowlist via env.
- Rate limiting (login, password reset, AI, QR token endpoints).
- File upload validation (size, MIME and extension; do not trust filename; random storage name; malware scanning integration optional).
- SQL injection protection via parameterized JPA queries.
- XSS prevention; sanitize rich text.
- Secrets via env variables.
- Security headers.
- Audit log.
- Tenant isolation tests.
- Do not log access tokens, passwords, full payment references, or private visitor info.

---

## 8. Database Design (logical schema)

All society-owned tables should include `society_id` where practical and have indexes for frequently queried fields. Use foreign keys and constraints.

### Core
- `societies`: id, name, slug, address, city, state, postal_code, timezone, currency, contact_email, contact_phone, status, created_at, updated_at
- `buildings`: id, society_id, name/code, address_optional, created_at
- `floors`: id, society_id, building_id, floor_number/name
- `flats`: id, society_id, building_id, floor_id, unit_number, flat_type, area_sqft, occupancy_status, active
- `users`: id, email, phone_optional, password_hash, display_name, status, last_login_at, created_at, updated_at
- `society_memberships`: id, society_id, user_id, role, status, invited_at, joined_at; unique(society_id,user_id) unless multi-role design explicitly supported
- `household_members`: id, society_id, flat_id, user_id_optional, name, relationship, contact_optional, is_primary, residency_type, start_date, end_date
- `invitations`: id, society_id, email, role, flat_id_optional, token_hash, expires_at, accepted_at, created_by

### Billing
- `billing_periods`: id, society_id, name, start_date, end_date, status
- `bills`: id, society_id, flat_id, bill_number, billing_period_id_optional, issue_date, due_date, subtotal, discount, late_fee, total_amount, amount_paid, status, notes, created_by, created_at, version
- `bill_items`: id, bill_id, description, quantity, unit_price, amount, item_type
- `payments`: id, society_id, bill_id, amount, method, transaction_reference_optional, proof_file_id_optional, status, submitted_at, verified_at, verified_by_optional, rejection_reason_optional, created_by, idempotency_key_optional
- `receipts`: id, society_id, payment_id, receipt_number, issued_at, generated_file_id_optional
- `financial_adjustments`: id, society_id, bill_id, amount, type, reason, approved_by, created_at
- `payment_reminders`: id, society_id, bill_id, scheduled_at, sent_at, channel, status

### Complaints
- `complaint_categories`: id, society_id, name, default_priority, default_sla_hours, active
- `complaints`: id, society_id, ticket_number, flat_id, created_by, category_id, title, description, priority, status, assigned_staff_id_optional, sla_due_at, resolved_at_optional, closed_at_optional, created_at, updated_at, version
- `complaint_comments`: id, complaint_id, author_id, body, visibility, created_at
- `complaint_attachments`: id, complaint_id, file_id, uploaded_by
- `complaint_events`: id, complaint_id, actor_id, event_type, from_value, to_value, note, created_at

### Visitors
- `visitor_invitations`: id, society_id, flat_id, invited_by, visitor_name, phone_optional, purpose, visit_start, visit_end, visitor_count, vehicle_number_optional, token_hash, status, created_at, revoked_at
- `visitor_entries`: id, society_id, invitation_id_optional, flat_id, visitor_name, phone_masked_optional, vehicle_number_optional, approved_by_optional, checked_in_by, checked_in_at, checked_out_by_optional, checked_out_at, status
- `walkin_approvals`: id, society_id, flat_id, visitor_details_safe, requested_by_security, status, resident_response_at, expires_at

### Notices
- `notices`: id, society_id, title, body, category, priority, audience_type, publish_at, expires_at_optional, status, pinned, created_by, published_at
- `notice_targets`: id, notice_id, building_id_optional, flat_id_optional, role_optional
- `notice_reads`: id, notice_id, user_id, read_at

### Facilities & bookings
- `facilities`: id, society_id, name, description, location, capacity, fee, approval_required, active, opening_time, closing_time, slot_minutes, buffer_minutes, rules
- `facility_blackouts`: id, facility_id, start_at, end_at, reason
- `bookings`: id, society_id, facility_id, flat_id, booked_by, start_at, end_at, attendee_count, status, fee, payment_status, cancellation_reason, approved_by_optional, created_at, version
- `booking_events`: id, booking_id, actor_id, event_type, note, created_at

### Staff & vendors
- `staff_profiles`: id, society_id, user_id_optional, name, phone, job_title, skills, active
- `vendors`: id, society_id, name, service_type, contact_name, phone, email_optional, address_optional, contract_start_optional, contract_end_optional, active
- `work_orders`: id, society_id, title, description, complaint_id_optional, vendor_id_optional, assigned_staff_id_optional, priority, status, due_at_optional, completed_at_optional, created_by
- `work_order_events`: id, work_order_id, actor_id, event_type, note, created_at

### Expenses & ledger
- `expense_categories`: id, society_id, name, active
- `expenses`: id, society_id, category_id, vendor_id_optional, title, description, amount, expense_date, invoice_file_id_optional, status, submitted_by, approved_by_optional, paid_at_optional
- `ledger_entries`: id, society_id, entry_type, source_type, source_id, debit, credit, posted_at, created_by, reversal_of_optional
- `expense_approvals`: id, expense_id, approver_id, decision, note, decided_at

### Notifications & audit
- `notifications`: id, society_id, user_id, type, title, body_safe, entity_type_optional, entity_id_optional, read_at, created_at
- `notification_preferences`: id, user_id, channel, event_type, enabled
- `audit_logs`: id, society_id_optional, actor_id_optional, action, entity_type, entity_id, metadata_safe_json, ip_hash_optional, request_id, created_at
- `files`: id, society_id, uploaded_by, storage_key, original_name_safe, mime_type, size_bytes, checksum, status, created_at
- `ai_conversations`: id, society_id, user_id, title, created_at, expires_at_optional
- `ai_messages`: id, conversation_id, role, content, source_refs_safe_json, created_at
- `knowledge_documents`: id, society_id, title, type, storage_file_id_optional, text_content, status, approved_by, created_at, updated_at
- `ai_usage_logs`: id, society_id, user_id, feature, model, tokens_optional, status, created_at

Use UUIDs (or opaque IDs) for public-facing identifiers; do not expose sequential database IDs as security tokens. Apply soft-delete only to records where it makes sense; financial/audit records should not be deleted.

---

## 9. API Endpoint Plan (minimum)

### Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/accept-invitation`
- `GET /api/v1/auth/me`

### Society & users
- `GET /api/v1/societies/current`
- `PATCH /api/v1/societies/current`
- `GET/POST /api/v1/buildings`
- `GET/POST /api/v1/flats`
- `GET/PATCH /api/v1/flats/{id}`
- `GET/POST /api/v1/residents`
- `GET/PATCH /api/v1/residents/{id}`
- `POST /api/v1/residents/import`
- `GET /api/v1/users`
- `POST /api/v1/invitations`
- `POST /api/v1/invitations/{id}/resend`
- `POST /api/v1/users/{id}/deactivate`

### Dashboard
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/finance`
- `GET /api/v1/dashboard/complaints`
- `GET /api/v1/dashboard/visitors`
- `GET /api/v1/dashboard/bookings`

### Bills & payments
- `GET/POST /api/v1/bills`
- `POST /api/v1/bills/generate`
- `GET /api/v1/bills/{id}`
- `POST /api/v1/bills/{id}/issue`
- `POST /api/v1/bills/{id}/cancel`
- `GET /api/v1/bills/{id}/pdf`
- `POST /api/v1/bills/{id}/payments`
- `GET /api/v1/payments`
- `POST /api/v1/payments/{id}/verify`
- `POST /api/v1/payments/{id}/reject`
- `GET /api/v1/payments/{id}/receipt`

### Complaints
- `GET/POST /api/v1/complaints`
- `GET/PATCH /api/v1/complaints/{id}`
- `POST /api/v1/complaints/{id}/assign`
- `POST /api/v1/complaints/{id}/status`
- `POST /api/v1/complaints/{id}/comments`
- `POST /api/v1/complaints/{id}/attachments`
- `POST /api/v1/complaints/{id}/confirm-resolution`
- `POST /api/v1/complaints/{id}/reopen`

### Visitors
- `GET/POST /api/v1/visitor-invitations`
- `GET /api/v1/visitor-invitations/{id}`
- `POST /api/v1/visitor-invitations/{id}/revoke`
- `POST /api/v1/gate/lookup`
- `POST /api/v1/gate/check-in`
- `POST /api/v1/gate/check-out`
- `GET /api/v1/gate/today`
- `POST /api/v1/gate/walk-ins`
- `POST /api/v1/gate/walk-ins/{id}/resident-approval`

### Notices
- `GET/POST /api/v1/notices`
- `GET/PATCH /api/v1/notices/{id}`
- `POST /api/v1/notices/{id}/publish`
- `POST /api/v1/notices/{id}/archive`
- `POST /api/v1/notices/{id}/read`

### Facilities/bookings
- `GET/POST /api/v1/facilities`
- `GET/PATCH /api/v1/facilities/{id}`
- `GET /api/v1/facilities/{id}/availability`
- `GET/POST /api/v1/bookings`
- `GET /api/v1/bookings/{id}`
- `POST /api/v1/bookings/{id}/approve`
- `POST /api/v1/bookings/{id}/reject`
- `POST /api/v1/bookings/{id}/cancel`

### Staff/vendors/work orders
- `GET/POST /api/v1/staff`
- `GET/POST /api/v1/vendors`
- `GET/POST /api/v1/work-orders`
- `GET/PATCH /api/v1/work-orders/{id}`
- `POST /api/v1/work-orders/{id}/assign`
- `POST /api/v1/work-orders/{id}/status`

### Expenses/reports
- `GET/POST /api/v1/expenses`
- `GET /api/v1/expenses/{id}`
- `POST /api/v1/expenses/{id}/submit`
- `POST /api/v1/expenses/{id}/approve`
- `POST /api/v1/expenses/{id}/reject`
- `POST /api/v1/expenses/{id}/mark-paid`
- `GET /api/v1/reports/collections`
- `GET /api/v1/reports/outstanding`
- `GET /api/v1/reports/expenses`
- `GET /api/v1/reports/complaints`
- `GET /api/v1/reports/bookings`
- `GET /api/v1/reports/occupancy`
- `GET /api/v1/reports/export`

### Notifications / AI / audit
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/read-all`
- `GET/POST /api/v1/ai/conversations`
- `POST /api/v1/ai/conversations/{id}/messages`
- `DELETE /api/v1/ai/conversations/{id}`
- `GET /api/v1/ai/knowledge`
- `POST /api/v1/ai/knowledge`
- `POST /api/v1/ai/knowledge/{id}/approve`
- `GET /api/v1/audit`
- `GET /api/v1/settings`

This list is a minimum contract; agent may add endpoints where needed but must document them in OpenAPI.

---

## 10. Business Rules & Validation

### Money
- Use `BigDecimal`, database `DECIMAL(12,2)`.
- Amount must be positive except adjustment records explicitly supporting signed amounts.
- Payment total cannot exceed outstanding amount unless overpayment is enabled.
- A verified payment cannot be edited; correction uses reversal/refund/adjustment.
- Bill total = sum(line items) + applicable fee/tax − discount.
- Verify bill and payment changes in a transaction.
- Duplicate idempotency keys must return same result or safe conflict, not double-charge.

### Booking
- `start_at < end_at`.
- Facility operating hours and blackout rules enforced.
- Capacity cannot be exceeded.
- No overlapping confirmed/requested booking (policy configurable) for same facility.
- Use transaction and locking/constraint strategy to prevent race-condition double booking.
- Booking belongs to resident's flat and society.

### Complaint
- Valid status transitions only.
- SLA timestamp computed from category and priority; working-hours support optional.
- Reopen permitted only within configurable window.
- Staff assignment must be active and in same society.

### Visitors
- Invitation valid only for date/time range and not revoked/expired.
- Token is random, hashed at rest, not predictable.
- Duplicate check-in should be rejected.
- Check-out only after check-in.
- Walk-in approval expires automatically.
- Do not expose full visitor phone to unauthorized roles.

### File upload
- Max file size configurable (default 10 MB).
- Allowed types: PDF, JPG, JPEG, PNG, WebP; optional CSV only in import module.
- Validate file signature/MIME where possible.
- Random storage name, private storage, authorization on download.
- Never execute uploaded files.
- Remove metadata where feasible for image uploads.
- Validate and sanitize filenames for display.

### General
- Email normalized and unique.
- Society slug unique.
- Flat number unique per building.
- Pagination size capped (e.g. 100).
- Filter inputs validated.
- Timezone-aware display.
- No leaking existence of another society's resource; return safe 404 for unauthorized cross-tenant access.

---

## 11. AI Integration Implementation Notes

- Create `GeminiService` behind interface `AiProvider`.
- Configuration: `GEMINI_API_KEY`, `GEMINI_MODEL`, timeout, max tokens, rate limits.
- Prefer current official Java SDK or documented REST integration; check official Gemini docs during implementation.
- Build prompts using explicit system policy and selected context. Do not use client-supplied role/context as authority.
- Use approved knowledge docs and retrieval (MVP: keyword search/SQL full-text; optional embeddings later).
- Return structured response DTO: answer, source references, disclaimer, usage metadata safe for UI.
- Store provider error category, not raw sensitive prompt or secrets.
- Implement retry only for transient errors, bounded exponential backoff.
- Add circuit breaker/fallback if dependency is available.
- Test provider via mock; integration test only when test API key available.
- Never invent source citations. Only cite retrieved approved documents.

### AI Assistant UI
- Chat layout, message bubbles, streaming if supported reliably.
- Typing indicator, retry, copy response, clear conversation.
- Suggested prompts: “How do I book the clubhouse?”, “Explain my bill”, “Draft a water shutdown notice”.
- Source chips/expandable citations.
- Context indicator for society knowledge.
- Error banner when Gemini unavailable and fallback help is used.
- For resident bill questions, fetch only that resident's bill data and redact sensitive fields.

---

## 12. Testing Strategy & Definition of Done

### Backend tests
- Unit tests for bill calculation, late fees, status transitions, booking conflict, complaint SLA, visitor token expiry, role permissions.
- Integration tests for controllers, repositories, security and DB constraints.
- Tenant-isolation tests: society A user cannot read/update society B records.
- Payment verification cannot be performed by resident/security.
- Double booking race test.
- Duplicate payment/idempotency test.
- Upload validation tests.
- AI service tests with mock provider.
- Migration tests from empty DB.

### Frontend tests
- Component tests for forms, permission states, empty/loading/error.
- API integration tests with mocked API.
- E2E tests for critical journeys using Playwright or equivalent:
  1. Admin login → create flat/resident → issue bill.
  2. Resident login → view bill → submit payment → admin verifies → receipt.
  3. Resident creates complaint → admin assigns → staff resolves → resident confirms.
  4. Resident creates visitor invite → security checks in/out.
  5. Resident books amenity → conflict prevention.
  6. Admin publishes notice → resident sees and marks read.
  7. Admin submits expense → committee/admin approval.
  8. Gemini assistant handles supported FAQ and unavailable-provider case.
- Mobile viewport smoke tests.

### Quality gates
Before declaring done:
- Backend compiles.
- Frontend builds.
- All migrations apply cleanly to fresh DB.
- Unit/integration tests pass (report any unavailable tests accurately).
- Critical E2E flows pass.
- No console errors on critical screens.
- No unresolved TODO for required features.
- No broken navigation.
- No secrets committed.
- Responsive checks at 320px, 375px, 768px, 1024px, 1440px.
- OpenAPI documentation available.
- README setup steps verified from clean clone.
- `BUILD_STATUS.md` lists complete, partial, blocked, and untested work.

---

## 13. Seed Demo Environment

Create a deterministic demo seed profile (never auto-run in production):
- One sample society: `Green Valley Residency` (clearly labelled demo).
- 3 buildings, 4 floors each, realistic unit numbers.
- At least 20 flats, mix of occupied/vacant.
- Demo users for each implemented role; generated credentials documented only in local README and require reset for deployment.
- Sample bills: paid, unpaid, overdue, partial.
- Sample complaints across statuses.
- Visitors, notices, bookings, expenses, staff and vendors.
- Facilities: clubhouse, gym, badminton court, community hall.
- Dashboard figures derived from seed data.
- Provide a reset-seed script that is safe for local development only.

---

## 14. Environment Variables

Provide `.env.example` (no secrets):
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=societysync
DB_USERNAME=societysync_user
DB_PASSWORD=change_me

# Backend
SPRING_PROFILES_ACTIVE=local
SERVER_PORT=8080
APP_BASE_URL=http://localhost:5173
JWT_SECRET=replace_with_long_random_secret
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata

# Gemini (server only)
GEMINI_API_KEY=
GEMINI_MODEL=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=

# Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./uploads
MAX_UPLOAD_MB=10

# Optional payments (do not claim real payment until configured)
PAYMENT_PROVIDER=manual
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=

# Observability
LOG_LEVEL=INFO
```
Use config validation on startup. Do not print secret values.

---

## 15. Repository Structure (target)

```text
societysync/
├── README.md
├── PRD.md
├── AGENT_INSTRUCTIONS.md
├── BUILD_STATUS.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── security.md
│   ├── setup.md
│   ├── demo-guide.md
│   └── testing.md
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/java/.../SocietySyncApplication.java
│       ├── main/java/.../common/
│       ├── main/java/.../auth/
│       ├── main/java/.../society/
│       ├── main/java/.../users/
│       ├── main/java/.../residents/
│       ├── main/java/.../flats/
│       ├── main/java/.../billing/
│       ├── main/java/.../payments/
│       ├── main/java/.../complaints/
│       ├── main/java/.../visitors/
│       ├── main/java/.../notices/
│       ├── main/java/.../facilities/
│       ├── main/java/.../bookings/
│       ├── main/java/.../staff/
│       ├── main/java/.../vendors/
│       ├── main/java/.../expenses/
│       ├── main/java/.../notifications/
│       ├── main/java/.../reports/
│       ├── main/java/.../ai/
│       ├── main/java/.../audit/
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db/migration/
│       └── test/
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app/
│   │   ├── api/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── styles/
│   └── tests/
└── scripts/
    ├── dev-start.sh
    ├── dev-start.ps1
    ├── seed-demo.sh
    └── reset-demo.sh
```
Use a real Java package name (e.g. `com.societysync`) and keep the tree aligned with implemented modules.

---

## 16. Build Phases (Agent must follow)

### Phase 0 — Repository reconnaissance & plan
- Inspect current repository, files, git status, framework and existing code.
- If blank repo, initialize structure.
- Do not delete/overwrite existing user work without asking.
- Create `BUILD_STATUS.md`, record baseline and plan.
- Identify unclear/contradictory requirements; resolve with sensible defaults and record decisions.
- Create architecture and database docs.
- Output a short plan before code changes.

### Phase 1 — Foundation
- Docker Compose for MySQL.
- Backend project, config, Flyway, health endpoint.
- Frontend project, design system, routing, layouts.
- API client, error handling, typed DTO.
- CI/build scripts.
- Verify both apps start.

### Phase 2 — Auth & tenancy
- User/membership/roles.
- Login, refresh, logout, invitation, reset flow.
- Authorization and society scope.
- Seed demo roles.
- Test tenant isolation.

### Phase 3 — Society, flats & residents
- Buildings, floors, units, resident profiles.
- CSV import.
- Admin and resident UI.
- Validate unique unit and membership.

### Phase 4 — Billing & payments
- Billing templates/periods, bill creation and issue.
- Payment submission/recording/verification.
- Receipts, outstanding reports.
- Transaction correctness and tests.

### Phase 5 — Complaints & work orders
- Ticket creation, assignment, comments, timeline, SLA.
- Staff workflow and resident tracking.
- Notifications and tests.

### Phase 6 — Visitor management
- Invitations, secure token/QR, gate workflow, walk-ins.
- Security UI, privacy restrictions and tests.

### Phase 7 — Notices & facilities
- Publish notices/audience/read state.
- Facility setup, availability, booking, approvals and conflict tests.

### Phase 8 — Expenses, reports & notifications
- Expense approval workflow, ledger.
- Dashboard analytics from real data.
- CSV/PDF export.
- In-app and email adapter.

### Phase 9 — Gemini AI
- Server-side Gemini provider.
- Approved knowledge ingestion.
- Assistant, drafting, summaries.
- Rate limiting, privacy and fallback tests.

### Phase 10 — Polish, security & release
- Responsive pass across all screens.
- Accessibility pass.
- E2E critical workflows.
- Security review and dependency check.
- Docker production configuration.
- Documentation and demo script.
- Final `BUILD_STATUS.md` and known limitations.

At the end of every phase: run tests/build, fix regressions, update status, and only then continue.

---

## 17. AI Coding Agent Master Instructions

Copy these instructions as the agent's operating rules:

1. Read this entire PRD and repository before coding.
2. Build a fully functional system, not a mockup. Never use fake buttons or fake backend success.
3. Do not skip modules silently. If scope is too large, implement the MVP in the defined phases and clearly report what remains.
4. First create a task checklist and architecture. Keep `BUILD_STATUS.md` updated.
5. Do not change the stack: Java 21 + Spring Boot + React/TypeScript + MySQL + Gemini.
6. Use modular monolith architecture; do not create microservices.
7. Use migrations; never rely on Hibernate auto-create in production.
8. Use DTOs, validation, service-layer business rules, transaction boundaries and centralized errors.
9. Enforce tenant isolation and role permissions in every relevant endpoint.
10. Write tests for business logic and security. Never remove tests merely to make builds pass.
11. Use real API calls and database persistence. Seed data only for demo.
12. Do not hardcode Gemini API key, model, database credentials or tokens. Use environment variables.
13. Before implementing Gemini, verify current official Google Gemini API/Java integration instructions and choose a currently supported model via configuration.
14. If external API credentials are missing, implement a provider interface and a transparent dev fallback. Never fabricate Gemini output or claim it was generated by Gemini.
15. Keep UI premium, coherent, responsive and accessible. Verify every page at desktop and mobile widths.
16. Every form has validation; every async action has loading, error, success and retry behavior.
17. Every list has search/filter/pagination where appropriate.
18. Every destructive or financial action has confirmation and audit trail.
19. Do not expose secrets or sensitive personal data in logs or browser code.
20. Handle edge cases, race conditions, duplicate submissions, empty data, expired tokens, permissions and network failures.
21. Run backend tests, frontend tests, builds, migrations and critical E2E tests. Fix failures.
22. Never claim a test passed unless it was actually run and passed.
23. Do not stop after scaffolding or a landing page. Complete the workflows.
24. Maintain README with exact local setup, env configuration, demo credentials, migration, seed, test and deployment steps.
25. When finished, report: implemented modules, commands run/results, demo account roles, setup steps, known limitations and files changed.

### Work style
- Make small coherent changes.
- Prefer reliable/simple solutions over unnecessary complexity.
- Keep naming and API contracts consistent.
- Ask the user only when a decision blocks implementation or risks destructive changes; otherwise choose a documented default.
- Never overwrite existing data or files without checking.
- Before finalizing, inspect git diff and ensure no secrets or accidental generated files are committed.

---

## 18. Acceptance Checklist

### Auth and permissions
- [ ] Login, logout, refresh and reset flows work.
- [ ] Invited user activates account.
- [ ] Resident cannot access another flat.
- [ ] Cross-society access denied.
- [ ] Security role cannot access financial APIs.
- [ ] Staff sees only assigned work.

### Society and resident data
- [ ] Admin creates building/floor/flat.
- [ ] Duplicate flat rejected.
- [ ] Resident invited and linked.
- [ ] CSV import preview and errors work.
- [ ] Occupancy summary accurate.

### Billing
- [ ] Admin creates and issues bill.
- [ ] Bill totals correct.
- [ ] Resident sees own bill only.
- [ ] Payment submission works.
- [ ] Admin verifies/rejects.
- [ ] Outstanding balance updates atomically.
- [ ] Receipt available.
- [ ] Duplicate payment blocked.
- [ ] Aging report correct.

### Complaints
- [ ] Resident creates ticket and receives ticket number.
- [ ] Admin assigns staff.
- [ ] Staff updates status.
- [ ] Timeline persists.
- [ ] Resident confirms/reopens under rules.
- [ ] SLA overdue is correctly calculated.

### Visitors
- [ ] Resident creates invitation.
- [ ] Token/QR validates and expires.
- [ ] Security checks in/out.
- [ ] Walk-in approval works.
- [ ] Unauthorized user cannot see visitor details.

### Notices
- [ ] Draft/publish/archive works.
- [ ] Audience targeting works.
- [ ] Resident can read and mark read.
- [ ] Expired notice is hidden/archived according to policy.

### Facilities
- [ ] Facility configuration works.
- [ ] Availability accurate.
- [ ] Double booking prevented.
- [ ] Approval/rejection/cancellation works.
- [ ] Fees correctly shown if enabled.

### Expenses
- [ ] Expense submission and approval work.
- [ ] Rejection requires reason.
- [ ] Approved expenses appear in correct reports.
- [ ] Posted ledger correction uses reversal, not deletion.

### AI
- [ ] Gemini key remains server-side.
- [ ] Approved knowledge context is used.
- [ ] Unsupported answer admits uncertainty.
- [ ] Rate limit works.
- [ ] AI unavailable state and fallback work.
- [ ] No sensitive fields sent unnecessarily.
- [ ] Draft requires human approval before publishing.

### UX
- [ ] No broken routes or dead buttons.
- [ ] Responsive at 320px+.
- [ ] Loading/empty/error states present.
- [ ] Forms validated.
- [ ] Keyboard/focus works.
- [ ] No browser console errors in main flows.

### Release
- [ ] Clean clone setup verified.
- [ ] Docker Compose starts services.
- [ ] Flyway migration succeeds.
- [ ] Tests and builds pass.
- [ ] Demo seed works.
- [ ] Documentation and status accurate.

---

## 19. Demo Presentation Script (7–10 minutes)

1. Login as Society Admin; show dashboard and society metrics.
2. Create a flat and invite a resident.
3. Login as resident; show resident dashboard and notices.
4. Admin issues maintenance bill; resident submits payment proof.
5. Admin verifies payment; show receipt and outstanding report.
6. Resident creates complaint; admin assigns staff; staff resolves; resident confirms.
7. Resident pre-approves visitor; security checks in and checks out.
8. Resident books clubhouse; demonstrate conflict prevention by attempting overlapping booking.
9. Admin publishes notice and views read analytics.
10. Add expense, submit for approval, show committee view.
11. Ask Gemini assistant a policy FAQ; show cited knowledge source and uncertainty handling.
12. Show mobile responsive version.
13. Close with architecture, security, tests and deployment.

---

## 20. Final Deliverables

The agent must deliver:
- Complete working source code.
- Backend and frontend.
- MySQL schema via Flyway migrations.
- Docker Compose and Dockerfiles.
- `.env.example`.
- Seed/demo data and reset script.
- API documentation (OpenAPI/Swagger).
- README with setup, demo credentials, test, deployment.
- Architecture, database, API, security and testing docs.
- `BUILD_STATUS.md` with honest feature status.
- Automated tests.
- Responsive polished UI.
- Gemini integration with documented configuration and safe fallback.
- Final report listing what works, what was tested, and any remaining limitations.

**Success criteria:** A reviewer can clone the repository, configure environment variables, start it with documented commands, log in to demo accounts, complete core society workflows, and see a polished responsive product without needing undocumented manual steps.
