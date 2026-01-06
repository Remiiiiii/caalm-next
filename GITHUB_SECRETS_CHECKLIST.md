# GitHub Secrets Checklist

Use this checklist to ensure all required secrets are configured in GitHub.

## Quick Setup Steps

1. ✅ Go to GitHub: `Settings` → `Secrets and variables` → `Actions`
2. ✅ For each secret below, click `New repository secret`
3. ✅ Copy the value from your Appwrite Console or local `.env` file
4. ✅ Paste into GitHub and save

## Required Secrets Checklist

### Core Appwrite (4 secrets)
- [ ] `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- [ ] `NEXT_PUBLIC_APPWRITE_PROJECT`
- [ ] `NEXT_APPWRITE_API_KEY`
- [ ] `NEXT_PUBLIC_APPWRITE_DATABASE`

### Collections (25 secrets)
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

### Storage (2 secrets)
- [ ] `NEXT_PUBLIC_APPWRITE_BUCKET`
- [ ] `NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET`

### Optional Third-Party (8 secrets)
- [ ] `GOV_API_KEY` (optional)
- [ ] `TWILIO_ACCOUNT_SID` (optional)
- [ ] `TWILIO_AUTH_TOKEN` (optional)
- [ ] `TWILIO_PHONE_NUMBER` (optional)
- [ ] `MICROSOFT_CLIENT_ID` (optional)
- [ ] `MICROSOFT_CLIENT_SECRET` (optional)
- [ ] `MICROSOFT_TENANT_ID` (optional)
- [ ] `NEXT_PUBLIC_REDIRECT_URI` (optional)

## Where to Find Values

### From Appwrite Console
1. **Project ID**: Settings → General → Project ID
2. **API Key**: Settings → API Keys → Create new (Server scope)
3. **Database ID**: Databases → Your Database → Copy ID from URL
4. **Collection IDs**: Databases → Your Database → Collection → Copy ID from URL
5. **Bucket IDs**: Storage → Bucket → Copy ID from URL

### From Local .env File
If you have a local `.env` or `.env.local` file, you can copy values directly:
- Look for variables starting with `NEXT_PUBLIC_APPWRITE_` or `NEXT_APPWRITE_`
- Copy the values (without the variable name) to GitHub Secrets

## Verification

After setting up all secrets:
1. ✅ Push a commit or create a PR
2. ✅ Check GitHub Actions workflow
3. ✅ Verify Playwright tests run without "Project not found" errors
4. ✅ Confirm tests can connect to Appwrite

## Need Help?

See `GITHUB_SECRETS_SETUP.md` for detailed instructions on finding each value.
