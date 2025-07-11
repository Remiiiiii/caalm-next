# Backend Configuration Checklist

## 1. Database Setup

- [ ] **Define Database Schema**
  - [ ] Users collection (roles, departments, status, etc.)
  - [ ] Contracts collection (title, parties, status, deadlines, etc.)
  - [ ] Documents collection (file metadata, owner, contract link, etc.)
  - [ ] Training/Certifications collection (employee, type, due date, status)
  - [ ] Audit logs collection (user, action, timestamp, target)
  - [ ] Invitations collection (email, role, token, status, expiry)
- [ ] **Indexes**
  - [ ] Add indexes for common queries (by user, contract, status, etc.)
- [ ] **Relationships**
  - [ ] Set up foreign keys/relations (e.g., user to department, document to contract)
- [ ] **Permissions**
  - [ ] Role-based access at the collection/document level

## 2. API Endpoints

- [ ] **User Management**
  - [x] Invite user (send invite, create invite record)
  - [x] Accept invite (create user after invite accepted)
  - [x] Resend/revoke invite
  - [x] Authentication (sign-in, sign-up, OTP/email verification)
  - [ ] Update user profile (name, department, role)
  - [ ] Deactivate/delete user
- [ ] **Contract Management**
  - [ ] Create, read, update, delete contracts
  - [ ] Assign contracts to users/departments
  - [ ] Approve/reject contract proposals
- [ ] **Document Management**
  - [x] Upload document
  - [ ] Link document to contract/user
  - [ ] Download/view document
  - [ ] Delete document
- [ ] **Training/Certification**
  - [ ] Add/update training records
  - [ ] Track certification status
  - [ ] Send reminders for expiring certifications
- [ ] **Audit Logging**
  - [ ] Log user actions (who, what, when)
  - [ ] Retrieve audit logs (for admin/executive)
- [ ] **Notifications**
  - [ ] Send email/in-app notifications for deadlines, approvals, etc.
  - [ ] Retrieve notification history

## 3. Environment & Security

- [ ] **Environment Variables**
  - [ ] Database connection strings
  - [ ] API keys/secrets
- [ ] **Validation & Sanitization**
  - [ ] Input validation for all endpoints
- [ ] **Error Handling**
  - [ ] Consistent error responses
- [ ] **Rate Limiting/Throttling**
- [ ] **Logging & Monitoring**

---

## Focusing on a Specific Missing Backend Feature

### User Profile Update API

**Why this?**
Currently, there is no clear endpoint or action for updating user profile details (name, department, role) after account creation. This is a core feature for any admin panel and is required for HR/Manager workflows.

#### Proposed Steps:

1. **API Route:**
   - Create `src/app/api/user/update/route.ts` (or similar).
2. **Action Function:**
   - Add an update function in `src/lib/actions/user.actions.ts`.
3. **Validation:**
   - Ensure only authorized users (self or admin) can update.
4. **Database Update:**
   - Update the user document in the database.
5. **Return:**
   - Return updated user data or error.

---

Would you like to proceed with implementing the **User Profile Update API** as the first missing backend feature, or focus on another item from the checklist?
