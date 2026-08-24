# GitHub Secrets Setup Guide

This guide will help you configure GitHub Secrets with your Appwrite credentials to enable integration tests in CI/CD.

## Prerequisites

- Access to your Appwrite Console
- Admin access to your GitHub repository
- Your Appwrite project ID and API key

## Step 1: Access GitHub Secrets

1. Go to your GitHub repository: `https://github.com/Remiiiiii/caalm-next`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

## Step 2: Find Your Appwrite Credentials

### Core Appwrite Configuration

#### 1. `NEXT_PUBLIC_APPWRITE_ENDPOINT`

- **Where to find**: Your Appwrite endpoint URL
- **Example values**:
  - Cloud: `https://cloud.appwrite.io/v1`
  - Self-hosted: `https://your-domain.com/v1`
- **How to find**: Check your Appwrite project settings or use the default cloud endpoint

#### 2. `NEXT_PUBLIC_APPWRITE_PROJECT`

- **Where to find**: Appwrite Console → Your Project → Settings → General
- **What it looks like**: A string like `65a1b2c3d4e5f6g7h8i9j0k`
- **How to find**:
  1. Log into [Appwrite Console](https://cloud.appwrite.io)
  2. Select your project
  3. Go to **Settings** → **General**
  4. Copy the **Project ID**

#### 3. `NEXT_APPWRITE_API_KEY`

- **Where to find**: Appwrite Console → Your Project → Settings → API Keys
- **What it looks like**: A long string starting with your project ID
- **How to find**:
  1. In Appwrite Console, go to **Settings** → **API Keys**
  2. Click **Create API Key**
  3. Name it: `GitHub Actions CI`
  4. Select scopes: **Server** (full access)
  5. Copy the generated key (you'll only see it once!)

#### 4. `NEXT_PUBLIC_APPWRITE_DATABASE`

- **Where to find**: Appwrite Console → Databases
- **What it looks like**: A string like `65a1b2c3d4e5f6g7h8i9j0k`
- **How to find**:
  1. Go to **Databases** in the sidebar
  2. Click on your database
  3. Copy the **Database ID** from the URL or settings

### Collection IDs

For each collection, find the Collection ID:

1. Go to **Databases** → Your Database
2. Click on the collection
3. Copy the **Collection ID** from the URL or settings

#### Required Collection Secrets:

| Secret Name                                                     | Collection Name               | Where to Find                                                  |
| --------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`                         | Users                         | Databases → Your DB → Users collection                         |
| `NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION`                   | Permissions                   | Databases → Your DB → Permissions collection 
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION`                         | Files                         | Databases → Your DB → Files collection                         |
| `NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION`                     | Contracts                     | Databases → Your DB → Contracts collection                     |
| `NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION` | Contracts Enterprise Metadata | Databases → Your DB → Contracts Enterprise Metadata collection |
| `NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION`           | Contract Extensions           | Databases → Your DB → Contract Extensions collection           |
| `NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION`               | Contract Drafts               | Databases → Your DB → Contract Drafts collection               |
| `NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION`               | Calendar Events               | Databases → Your DB → Calendar Events collection               |
| `NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION`             | Recent Activities             | Databases → Your DB → Recent Activities collection             |
| `NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION`                   | Invitations                   | Databases → Your DB → Invitations collection                   |
| `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION`                       | Reports                       | Databases → Your DB → Reports collection                       |
| `NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION`                      | Licenses                      | Databases → Your DB → Licenses collection                      |
| `NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION`                     | OTP Tokens                    | Databases → Your DB → OTP Tokens collection                    |
| `NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION`                 | Notifications                 | Databases → Your DB → Notifications collection                 |
| `NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION`            | Notification Types            | Databases → Your DB → Notification Types collection            |
| `NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION`         | Notification Settings         | Databases → Your DB → Notification Settings collection         |
| `NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION`          | SMS Form Submissions          | Databases → Your DB → SMS Form Submissions collection          |
| `NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION`     | Notification Digest Queue     | Databases → Your DB → Notification Digest Queue collection     |
| `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION`                         | Notes                         | Databases → Your DB → Notes collection                         |
| `NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION`            | Calendar Approvals            | Databases → Your DB → Calendar Approvals collection            |
| `NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION` | Calendar Permission Overrides | Databases → Your DB → Calendar Permission Overrides collection |
| `NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION`                    | Audit Logs                    | Databases → Your DB → Audit Logs collection                    |
| `NEXT_PUBLIC_APPWRITE_AUDITS_COLLECTION`                        | Audits                        | Databases → Your DB → Audits collection                        |
| `NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION`         | Calendar Integrations         | Databases → Your DB → Calendar Integrations collection         |
| `NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION`              | Shared Calendars              | Databases → Your DB → Shared Calendars collection              |
| `NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION`            | Calendar Resources            | Databases → Your DB → Calendar Resources collection            |
| `NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION`             | Resource Bookings             | Databases → Your DB → Resource Bookings collection             |

### Storage Buckets

#### 5. `NEXT_PUBLIC_APPWRITE_BUCKET`

- **Where to find**: Appwrite Console → Storage
- **How to find**:
  1. Go to **Storage** in the sidebar
  2. Click on your main storage bucket
  3. Copy the **Bucket ID**

#### 6. `NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET`

- **Where to find**: Appwrite Console → Storage
- **How to find**:
  1. Go to **Storage** in the sidebar
  2. Click on your profile pictures bucket
  3. Copy the **Bucket ID**

### Optional Third-Party Services

These are optional and only needed if you use these services:

| Secret Name                | Service         | Where to Find                                                                       |
| -------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `GOV_API_KEY`              | SAM.gov API     | Your SAM.gov API key (if using contract fetching)                                   |
| `TWILIO_ACCOUNT_SID`       | Twilio          | Twilio Console → Account SID                                                        |
| `TWILIO_AUTH_TOKEN`        | Twilio          | Twilio Console → Auth Token                                                         |
| `TWILIO_PHONE_NUMBER`      | Twilio          | Twilio Console → Phone Numbers                                                      |
| `MICROSOFT_CLIENT_ID`      | Microsoft Graph | Azure Portal → App Registrations                                                    |
| `MICROSOFT_CLIENT_SECRET`  | Microsoft Graph | Azure Portal → App Registrations → Certificates & secrets                           |
| `MICROSOFT_TENANT_ID`      | Microsoft Graph | Azure Portal → Azure Active Directory → Properties                                  |
| `NEXT_PUBLIC_REDIRECT_URI` | Microsoft Graph | Your app's redirect URI (e.g., `http://localhost:3000/api/auth/callback/microsoft`) |

## Step 3: Add Secrets to GitHub

For each secret above:

1. In GitHub, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter the **Name** (exactly as listed above)
4. Enter the **Value** (paste from Appwrite)
5. Click **Add secret**

## Step 4: Verify Secrets Are Set

After adding all secrets, verify they're configured:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see all the secrets listed
3. The count should match the number of secrets you added

## Step 5: Test the Configuration

1. Push a commit or create a pull request
2. Check the GitHub Actions workflow run
3. The Playwright tests should now connect to your Appwrite instance
4. If you see "Project with the requested ID could not be found", double-check:
   - The `NEXT_PUBLIC_APPWRITE_PROJECT` secret is correct
   - The `NEXT_APPWRITE_API_KEY` has server permissions
   - The project ID matches your Appwrite project

## Quick Reference: All Required Secrets

### Required (Core Appwrite)

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT`
- `NEXT_APPWRITE_API_KEY`
- `NEXT_PUBLIC_APPWRITE_DATABASE`

### Required (Collections - 26 secrets)

- `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_AUDITS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION`
- `NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION`

### Required (Storage - 2 secrets)

- `NEXT_PUBLIC_APPWRITE_BUCKET`
- `NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET`

### Optional (Third-Party Services - 8 secrets)

- `GOV_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `NEXT_PUBLIC_REDIRECT_URI`

**Total Required Secrets: 35**
**Total Optional Secrets: 8**

### Playwright E2E (authenticated dashboard tests)

Add this **repository secret** so CI can complete [`tests/auth.setup.js`](tests/auth.setup.js) with a real Appwrite **users collection** row (same database as `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`):

| Secret Name | Description |
| ----------- | ----------- |
| `PLAYWRIGHT_E2E_USER_ID` | Document `$id` of a dedicated E2E user in your users table (not necessarily the Appwrite Account ID). The user must resolve via [`getCurrentUserFrom2FA`](src/lib/actions/user.actions.ts) when cookies `2fa_completed=true` and `2fa_user_id` are set. Grant org/RBAC so the user can open `/dashboard` (redirects to the correct role home). |

For local Playwright runs, set the same value in `.env.local` or the shell, for example: `PLAYWRIGHT_E2E_USER_ID=<your-user-document-id>`.

**E2E preflight (runs before auth setup):** Playwright calls `GET /api/test/e2e-preflight` to verify:

1. `organizations` row `default_organization` exists
2. `NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION` points at the **permissions** table (permission keys like `settings.billing`), not `role_permissions`
3. The E2E user resolves to Super Admin (or otherwise has `settings.billing`) via `user_roles` → `role_permissions` → `permissions`

If preflight fails, fix Appwrite data or secrets — do not add per-user permission documents or hardcoded RBAC bypasses. See [`src/lib/e2e/preflight.ts`](src/lib/e2e/preflight.ts).

### CLM roadmap CI webhooks

After Playwright passes, [`scripts/notify-roadmap-ci.mjs`](scripts/notify-roadmap-ci.mjs) calls production roadmap endpoints so merged PRs can flip section tasks to `complete`:

| Secret Name | Description |
| ----------- | ----------- |
| `ROADMAP_WEBHOOK_SECRET` | Same HMAC secret as Vercel (`ROADMAP_WEBHOOK_SECRET` or `GITHUB_WEBHOOK_SECRET`). Required for roadmap notifications. |
| `ROADMAP_APP_URL` | Optional. Production app origin (e.g. `https://www.caalmsolutions.com`). Defaults to that URL if unset. |

**One-time backfill** (e.g. PR #49 already merged before this wiring):

```bash
ROADMAP_WEBHOOK_SECRET=... ROADMAP_APP_URL=https://www.caalmsolutions.com \
  node scripts/notify-roadmap-ci.mjs --backfill --pr 49 --sha <merge-commit-sha>
```

Ensure Vercel production has `ROADMAP_USE_APPWRITE=true` and roadmap collection IDs, then run `pnpm exec tsx scripts/seed-roadmap-appwrite.ts` if tables are empty.

### RBAC `roles` table (optional columns)

Add these optional attributes to the Appwrite **Tables** `roles` table when you want dashboard home routing stored in the database (until then, the app uses [`ROLE_DASHBOARD_FALLBACK`](src/lib/rbac/role-dashboard-metadata.ts)):

- `priority` (integer) — lower number = higher precedence for default dashboard selection.
- `homeDashboardPath` (string) — e.g. `/dashboard/superadmin`.

After columns exist, run: `pnpm tsx scripts/backfill-role-dashboard-metadata.ts` (requires server API key env vars).

## Troubleshooting

### "Project with the requested ID could not be found"

- Verify `NEXT_PUBLIC_APPWRITE_PROJECT` matches your Appwrite project ID
- Check that the project ID doesn't have extra spaces or characters
- Ensure you're using the correct Appwrite endpoint

### "Unauthorized" or "Invalid API Key"

- Verify `NEXT_APPWRITE_API_KEY` is correct
- Ensure the API key has **Server** scope (not Client)
- Check that the API key hasn't been revoked

### "Database not found"

- Verify `NEXT_PUBLIC_APPWRITE_DATABASE` matches your database ID
- Ensure the database exists in your Appwrite project

### "Collection not found"

- Verify the collection ID secret matches the actual collection ID
- Check that the collection exists in the specified database
- Ensure collection names match between secrets and Appwrite

## Security Notes

- ⚠️ **Never commit secrets to your repository**
- ⚠️ **API keys should have minimal required permissions**
- ⚠️ **Rotate API keys periodically**
- ⚠️ **Use separate Appwrite projects for development and production if possible**
- ⚠️ **Consider using a test Appwrite project for CI/CD to avoid affecting production data**

## Next Steps

After setting up secrets:

1. Run a test workflow to verify everything works
2. Monitor the first few CI runs to ensure no connection issues
3. Consider setting up a dedicated test Appwrite project for CI/CD
