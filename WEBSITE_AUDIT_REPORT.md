# SocietySync — Website Audit Report

**Audit Date:** 2026-11-20  
**Target Environment:** Live Full-Stack Node.js/Express + React/TypeScript Runtime (`http://localhost:3000`)

---

## A. Overall Status

| Area | Status | Notes |
|---|---|---|
| **Overall Website Health** | **READY WITH MINOR ISSUES** | All core workflows, RBAC, and responsive views verified; Java/MySQL container stack not executable in this Node-only sandbox. |
| **Frontend Health** | Healthy | Zero console errors, zero TypeScript errors, clean Vite production build. |
| **Backend Health** | Healthy | Express `/api/v1/*` server running cleanly with atomic file-backed persistence. |
| **Database Health** | Healthy (Dev Store) | `.data/societysync-db.json` persists all mutations; Flyway MySQL 8 DDL (`V1__init_schema.sql`) provided for Docker/MySQL deployment. |
| **API Health** | Healthy | All tested endpoints return accurate HTTP status codes (200/201/400/401/403/404/409/429). |
| **Security Health** | Hardened | 2 High-severity IDOR/RBAC bugs fixed and verified; rate limiting and security headers added. |
| **UI/UX Health** | Healthy | Clean SaaS hierarchy, tabular numerals, accessible forms, loading/empty/error states. |
| **Responsive Health** | Healthy | Verified at 320px mobile, 390px mobile, and 1440px desktop with zero horizontal overflow. |

---

## B. Bugs Found & Fixed

| Bug ID | Module | Severity | Description | Root Cause | Fix Applied | Verification |
|---|---|---|---|---|---|---|
| **BUG-01** | Complaints API | **High** | `POST /api/v1/complaints/:id/status` did not enforce role or flat/staff ownership, allowing Security, Residents, or unassigned Staff to mutate ticket status directly via API. | Missing role and ownership guards before calling `canTransitionComplaint`. | Added strict server-side checks blocking `SECURITY`/`COMMITTEE_MEMBER`, restricting `RESIDENT` to own flat + `CLOSED`/`REOPENED`, and `MAINTENANCE_STAFF` to assigned tickets + `IN_PROGRESS`/`RESOLVED`. | Verified via live API regression tests (403/404 returned). |
| **BUG-02** | Visitors API | **High** | `POST /api/v1/visitors/:id/action` did not block `MAINTENANCE_STAFF` and did not verify `flatId` ownership for `RESIDENT` on `REVOKE`/`DENY`. | Missing role guard at handler entry and missing `flatId` check in `REVOKE`/`DENY` branch. | Blocked `MAINTENANCE_STAFF` (403) and enforced `visitor.flatId === user.flatId` for `RESIDENT` on `REVOKE`/`DENY`. | Verified via live API regression tests (403 returned). |
| **BUG-03** | Auth & AI Security | **Medium** | No rate limiting on `POST /api/v1/auth/login` or `POST /api/v1/ai/chat`. | Rate limiter middleware was not yet wired into Express routes. | Added sliding-window `rateLimit(30, 15m)` middleware on `/auth/login` and `/ai/chat` returning HTTP `429`. | Verified in `server.ts` and clean build. |
| **BUG-04** | Dashboard UI | **Medium** | "Active Visitors" KPI card truncated `"1 in · 1 expected"` to `"1 in · 1 expect..."` at 1440px desktop width. | String too long for `text-2xl` inside 4-column KPI grid. | Formatted concisely as `"1 In / 1 Exp"`. | Verified in Playwright desktop screenshot (`audit-r2-desktop.png`). |
| **BUG-05** | HTTP Security | **Medium** | Missing standard security response headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). | No header middleware configured in Express. | Added iframe-safe security headers middleware in `server.ts`. | Verified `x-content-type-options: nosniff` on live `/api/v1/health`. |

---

## C. Feature Testing Table

| Feature | Status | Test Result | Bugs | Verification |
|---|---|---|---|---|
| **Login & RBAC** | Working | Pass (5/5 roles + invalid cred 401) | BUG-03 (Fixed) | Live API + Playwright |
| **Dashboard & Charts** | Working | Pass (real KPIs + Recharts) | BUG-04 (Fixed) | Playwright 1440px |
| **Flats & Directory** | Working | Pass (duplicate flat blocked 409) | None | Live API |
| **Billing & Payments** | Working | Pass (IDOR blocked 404, verify 403 for resident) | None | Unit + Live API + UI |
| **Complaints** | Working | Pass (SLA, transitions, RBAC/IDOR fixed) | BUG-01 (Fixed) | Unit + Live API |
| **Visitors & Gate** | Working | Pass (check-in/out, RBAC/IDOR fixed) | BUG-02 (Fixed) | Unit + Live API |
| **Facilities & Booking** | Working | Pass (overlap conflict returns 409) | None | Unit + Live API |
| **Notices** | Working | Pass (publish, pin, mark read) | None | Live API |
| **Expenses & Ledger** | Working | Pass (submit, approve/reject, CSV export) | None | Live API |
| **Gemini AI Assistant** | Working | Pass (grounded sources + safe fallback) | BUG-03 (Fixed) | Live API + Playwright |
| **Audit Log** | Working | Pass (admin/committee only, resident 403) | None | Live API |

---

## D. Security Findings
- **Resolved:** Closed IDOR/RBAC bypasses on complaint status transitions (`BUG-01`) and visitor revoke/deny actions (`BUG-02`), added rate limiting (`BUG-03`), and added security headers (`BUG-05`).
- **Verified Safe:** `GEMINI_API_KEY` is strictly server-side; passwords are hashed with `scryptSync` and verified with `timingSafeEqual`; resident finance and complaint queries are scoped by `societyId` and `flatId`.
- **Remaining Risks (Dev Environment):** Session tokens are stored in `sessionStorage` for iframe compatibility; production deployment should use `HttpOnly; Secure; SameSite=Strict` cookies and a strong `JWT_SECRET` environment variable.

---

## E. Responsive Testing Results
- **320px Mobile:** Pass — zero horizontal overflow (`scrollWidth <= clientWidth`), mobile drawer navigation works.
- **390px Mobile:** Pass — clean stacked cards, readable typography, accessible touch targets (`r1-mobile.png`).
- **1440px Desktop:** Pass — 260px sidebar, 4-column KPI grid with zero truncation (`audit-r2-desktop.png`), crisp Recharts layout.

---

## F. Test Results
- `npx --yes tsx --test server/domain.test.ts`: **7/7 passed**
- `tsc --noEmit` (`lint_applet`): **0 errors**
- `vite build` (`compile_applet`): **Succeeded**
- Live API & RBAC/IDOR Integration Audit: **20/20 assertions passed**
- Playwright Headless Chromium Checks: **Passed, 0 console errors**

---

## G. Remaining Issues & Environment Limitations
- **Java 21 / Spring Boot / MySQL / Docker:** Not installed in this cloud sandbox; therefore Maven builds and Docker Compose startup could not be executed here. The live web app runs on the Node.js/Express + Vite stack.
- **Optional Stretch Items:** Real SMTP email delivery, file attachment binary uploads, and CSV bulk resident import are not wired to external providers in this local sandbox.

---

## H. Final Verdict
**READY WITH MINOR ISSUES** — The live SocietySync web application is secure, responsive, and fully functional for demonstration across all 5 roles and core modules. Only the external Java/MySQL/Docker runtime verification remains for local deployment outside this Node-only container.
