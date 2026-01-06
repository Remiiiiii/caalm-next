# Test Appwrite Project Setup Checklist

Use this checklist to track your progress while creating the test Appwrite project.

## Project Setup

- [ ] Logged into Appwrite Console
- [ ] Created new project: `CAALM Test` or `CAALM CI/CD`
- [ ] Selected appropriate region
- [ ] Copied Project ID: `___________________________`
- [ ] Saved Project ID securely

## Database Setup

- [ ] Created test database: `test-database` or `ci-database`
- [ ] Copied Database ID: `___________________________`
- [ ] Saved Database ID securely

## Collections Setup (25 collections)

### Core Collections
- [ ] `users` → ID: `___________________________`
- [ ] `files` → ID: `___________________________`
- [ ] `contracts` → ID: `___________________________`
- [ ] `contracts-enterprise-metadata` → ID: `___________________________`
- [ ] `contract-extensions` → ID: `___________________________`
- [ ] `contract-drafts` → ID: `___________________________`

### Calendar Collections
- [ ] `calendar-events` → ID: `___________________________`
- [ ] `calendar-approvals` → ID: `___________________________`
- [ ] `calendar-permission-overrides` → ID: `___________________________`
- [ ] `calendar-integrations` → ID: `___________________________`
- [ ] `shared-calendars` → ID: `___________________________`
- [ ] `calendar-resources` → ID: `___________________________`
- [ ] `resource-bookings` → ID: `___________________________`

### Notification Collections
- [ ] `notifications` → ID: `___________________________`
- [ ] `notification-types` → ID: `___________________________`
- [ ] `notification-settings` → ID: `___________________________`
- [ ] `notification-digest-queue` → ID: `___________________________`
- [ ] `sms-form-submissions` → ID: `___________________________`

### Other Collections
- [ ] `recent-activities` → ID: `___________________________`
- [ ] `invitations` → ID: `___________________________`
- [ ] `reports` → ID: `___________________________`
- [ ] `licenses` → ID: `___________________________`
- [ ] `otp-tokens` → ID: `___________________________`
- [ ] `notes` → ID: `___________________________`
- [ ] `audit-logs` → ID: `___________________________`
- [ ] `audits` → ID: `___________________________`

## Storage Buckets

- [ ] Created main bucket: `test-bucket` or `ci-bucket`
- [ ] Copied Main Bucket ID: `___________________________`
- [ ] Created profile pictures bucket: `test-profile-pictures`
- [ ] Copied Profile Pictures Bucket ID: `___________________________`

## API Key

- [ ] Created API Key: `GitHub Actions CI - Test`
- [ ] Selected "Server" scope
- [ ] Copied API Key: `___________________________` (stored securely)
- [ ] Saved API Key in password manager or secure location

## GitHub Secrets Setup

### Core Secrets (4)
- [ ] `NEXT_PUBLIC_APPWRITE_ENDPOINT` = `https://cloud.appwrite.io/v1`
- [ ] `NEXT_PUBLIC_APPWRITE_PROJECT` = [test project ID]
- [ ] `NEXT_APPWRITE_API_KEY` = [test API key]
- [ ] `NEXT_PUBLIC_APPWRITE_DATABASE` = [test database ID]

### Collection Secrets (25)
- [ ] `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_AUDITS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION`
- [ ] `NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION`

### Storage Secrets (2)
- [ ] `NEXT_PUBLIC_APPWRITE_BUCKET`
- [ ] `NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET`

## Verification

- [ ] Test connection to Appwrite using test credentials
- [ ] Verified can read from test collections
- [ ] Verified can write to test collections
- [ ] Pushed a commit to trigger GitHub Actions
- [ ] Checked GitHub Actions workflow runs successfully
- [ ] Confirmed no "Project not found" errors
- [ ] Verified Playwright tests connect to test project

## Documentation

- [ ] Documented all test project IDs in secure location
- [ ] Shared test project info with team (if applicable)
- [ ] Updated team documentation with test project details

## Security Checklist

- [ ] Test project is separate from production
- [ ] Test project doesn't contain real user data
- [ ] Test API key has Server scope only
- [ ] Test credentials stored in GitHub Secrets (encrypted)
- [ ] Test project can be safely reset/deleted if needed

---

**Total Progress**: ___ / 45 items completed

**Notes:**
```
[Add any notes or issues encountered during setup]
```
