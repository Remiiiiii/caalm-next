# Backend Configuration Checklist

Status synced to the caalm-next codebase (Appwrite + Next.js API routes). Items marked
**out of scope** are not a first-class product module yet (e.g. mock-only training UI).

## 1. Database Setup

- [x] **Define Database Schema**
  - [x] Users collection (roles, departments, status, etc.)
  - [x] Contracts collection (title, parties, status, deadlines, etc.)
  - [x] Documents / Files collection (file metadata, owner, contract link, etc.)
  - [ ] Training/Certifications collection (employee, type, due date, status) — **out of scope** (HR dashboard still uses mock rows; no Appwrite training table)
  - [x] Audit logs collection (user, action, timestamp, target)
  - [x] Invitations collection (email, role, token, status, expiry)
- [x] **Indexes**
  - [x] Indexes for common queries (by user, contract, status, org, etc.)
- [x] **Relationships**
  - [x] Appwrite relationship / reference attributes (user↔org, document↔contract, etc.)
- [x] **Permissions**
  - [x] Role-based access via `permissions` / `role_permissions` / `user_roles` + `requirePermission()`

## 2. API Endpoints

- [x] **User Management**
  - [x] Invite user (send invite, create invite record)
  - [x] Accept invite (create user after invite accepted)
  - [x] Resend/revoke invite
  - [x] Authentication (sign-in, sign-up, OTP/email verification, step-up)
  - [x] Update user profile (name, department, role/status) — `updateUserProfile` in `user.actions.ts` + admin user management; settings `ProfileSettings` UI still needs to call the real action (mock TODO remains in that component)
  - [x] Deactivate/delete user — status updates + `deleteUserAccount` / revoke-sessions admin APIs
- [x] **Contract Management**
  - [x] Create, read, update, delete contracts
  - [x] Assign contracts to users/departments
  - [x] Approve/reject contract proposals (approval workflows)
- [x] **Document Management**
  - [x] Upload document
  - [x] Link document to contract/user
  - [x] Download/view document
  - [x] Delete document
- [ ] **Training/Certification** — **out of scope** (no dedicated APIs; licenses/certs cover credentials separately)
  - [ ] Add/update training records
  - [ ] Track certification status
  - [ ] Send reminders for expiring certifications
- [x] **Audit Logging**
  - [x] Log user actions (who, what, when)
  - [x] Retrieve audit logs (for admin/executive / audit readiness)
- [x] **Notifications**
  - [x] Send email/in-app notifications for deadlines, approvals, etc.
  - [x] Retrieve notification history

## 3. Environment & Security

- [x] **Environment Variables**
  - [x] Database connection / Appwrite IDs (`.env.example` + Vercel)
  - [x] API keys/secrets (Appwrite, Stripe, Mailgun, GitHub, etc.)
- [x] **Validation & Sanitization**
  - [x] Input validation for API endpoints (Zod / route guards on gated handlers)
- [x] **Error Handling**
  - [x] Consistent user-facing error helpers on major surfaces
- [x] **Rate Limiting/Throttling**
- [x] **Logging & Monitoring** (server logs + audit trail; ops/alerting continues to evolve)

---

## Remaining follow-ups (not checklist blockers)

1. **Settings → Profile UI:** `ProfileSettings.tsx` still simulates save; wire it to `updateUserProfile` / a profile API.
2. **Training module:** Only if product wants real employee training tracking beyond licenses/credentials.
3. Keep `.env.example` / demo env parity when new secrets are added.
