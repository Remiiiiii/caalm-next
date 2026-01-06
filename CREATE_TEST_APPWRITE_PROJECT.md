# Creating a Test Appwrite Project for CI/CD

This guide will walk you through creating a dedicated test Appwrite project for GitHub Actions CI/CD testing.

## Why Create a Test Project?

- ✅ Isolates test data from production
- ✅ Safe to reset/clean up without affecting real data
- ✅ Can use test-specific data without worrying about corruption
- ✅ Allows testing destructive operations safely
- ✅ Limits security risk if credentials are compromised

## Step 1: Create the Test Project

1. **Log into Appwrite Console**

   - Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
   - Sign in with your account

2. **Create New Project**

   - Click **"Create Project"** or the **"+"** button
   - **Project Name**: `CAALM Test` or `CAALM CI/CD`
   - **Region**: Choose the same region as production (or closest to your CI/CD servers)
   - Click **"Create"**

3. **Copy the Project ID**
   - After creation, go to **Settings** → **General**
   - Copy the **Project ID** (you'll need this for GitHub Secrets)
   - Save it somewhere safe: `TEST_PROJECT_ID = [your-project-id]`

## Step 2: Create the Test Database

1. **Navigate to Databases**

   - Click **"Databases"** in the sidebar
   - Click **"Create Database"**

2. **Configure Database**

   - **Database Name**: `test-database` or `ci-database`
   - Click **"Create"**

3. **Copy the Database ID**
   - Click on your newly created database
   - Copy the **Database ID** from the URL or settings
   - Save it: `TEST_DATABASE_ID = [your-database-id]`

## Step 3: Create Test Collections

You need to create all the collections that your application uses. Here's the complete list:

### Required Collections

Create each collection with these steps:

1. Click **"Create Collection"** in your test database
2. Enter the collection name (use the names below)
3. Set permissions (for testing, you can use "Any" or "Users" - we'll use API key for access)
4. Click **"Create"**
5. **Copy the Collection ID** from the URL or settings

#### Collection List (Create these in order):

| Collection Name                 | Collection ID Secret Name                                       | Notes                     |
| ------------------------------- | --------------------------------------------------------------- | ------------------------- |
| `users`                         | `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`                         | Test users only           |
| `files`                         | `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION`                         | Test files                |
| `contracts`                     | `NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION`                     | Test contracts            |
| `contracts-enterprise-metadata` | `NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION` | Test metadata             |
| `contract-extensions`           | `NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION`           | Test extensions           |
| `contract-drafts`               | `NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION`               | Test drafts               |
| `calendar-events`               | `NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION`               | Test calendar events      |
| `recent-activities`             | `NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION`             | Test activities           |
| `invitations`                   | `NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION`                   | Test invitations          |
| `reports`                       | `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION`                       | Test reports              |
| `licenses`                      | `NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION`                      | Test licenses             |
| `otp-tokens`                    | `NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION`                     | Test OTP tokens           |
| `notifications`                 | `NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION`                 | Test notifications        |
| `notification-types`            | `NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION`            | Test notification types   |
| `notification-settings`         | `NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION`         | Test settings             |
| `sms-form-submissions`          | `NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION`          | Test SMS submissions      |
| `notification-digest-queue`     | `NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION`     | Test digest queue         |
| `notes`                         | `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION`                         | Test notes                |
| `calendar-approvals`            | `NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION`            | Test approvals            |
| `calendar-permission-overrides` | `NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION` | Test permission overrides |
| `audit-logs`                    | `NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION`                    | Test audit logs           |
| `audits`                        | `NEXT_PUBLIC_APPWRITE_AUDITS_COLLECTION`                        | Test audits               |
| `calendar-integrations`         | `NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION`         | Test integrations         |
| `shared-calendars`              | `NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION`              | Test shared calendars     |
| `calendar-resources`            | `NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION`            | Test resources            |
| `resource-bookings`             | `NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION`             | Test bookings             |

### Quick Tip: Copy Collection Structure from Production

If you want to match your production structure:

1. **Option A: Manual Setup**

   - Create each collection manually
   - Add attributes as needed (you can add minimal attributes for testing)

2. **Option B: Export/Import** (if Appwrite supports it)

   - Export collection structure from production
   - Import into test project (without data)

3. **Option C: Minimal Setup**
   - Create collections with basic structure
   - Add attributes as tests require them

**For CI/CD testing, you typically don't need the full production schema - just enough structure for tests to run.**

## Step 4: Create Test Storage Buckets

1. **Navigate to Storage**

   - Click **"Storage"** in the sidebar
   - Click **"Create Bucket"**

2. **Create Main Bucket**

   - **Bucket Name**: `test-bucket` or `ci-bucket`
   - **Permissions**: Set as needed (for testing, "Any" is fine with API key)
   - Click **"Create"**
   - Copy the **Bucket ID**: `TEST_BUCKET_ID = [your-bucket-id]`

3. **Create Profile Pictures Bucket**
   - Click **"Create Bucket"** again
   - **Bucket Name**: `test-profile-pictures` or `ci-profile-pictures`
   - Click **"Create"**
   - Copy the **Bucket ID**: `TEST_PROFILE_PICTURES_BUCKET_ID = [your-bucket-id]`

## Step 5: Create Test API Key

1. **Navigate to API Keys**

   - Go to **Settings** → **API Keys**
   - Click **"Create API Key"**

2. **Configure API Key**

   - **Name**: `GitHub Actions CI - Test`
   - **Expiration**: Set to "Never" or a far future date
   - **Scopes**: Select **"Server"** (full access - needed for admin operations)
   - Click **"Create"**

3. **Copy the API Key**
   - ⚠️ **IMPORTANT**: Copy the API key immediately - you won't be able to see it again!
   - Save it securely: `TEST_API_KEY = [your-api-key]`
   - Store it in a password manager or secure note

## Step 6: Document All IDs

Create a document with all your test project IDs. Here's a template:

```markdown
# Test Appwrite Project Credentials

## Core Configuration

- Endpoint: https://cloud.appwrite.io/v1 (or your region)
- Project ID: [your-test-project-id]
- Database ID: [your-test-database-id]
- API Key: [your-test-api-key] (stored securely)

## Collections

- Users: [collection-id]
- Files: [collection-id]
- Contracts: [collection-id]
- ... (list all 25 collections)

## Storage

- Main Bucket: [bucket-id]
- Profile Pictures Bucket: [bucket-id]
```

## Step 7: Add Test Data (Optional)

For more realistic testing, you can add some test data:

1. **Test Users**

   - Create a few test user documents in the `users` collection
   - Use test emails like `test@example.com`, `test2@example.com`

2. **Test Contracts**

   - Create a few test contract documents
   - Use fake/dummy data

3. **Test Notifications**
   - Create test notification types
   - Add test notification settings

**Note**: For CI/CD, you often don't need test data - tests can create their own data and clean up after.

## Step 8: Verify Test Project Setup

1. **Test Connection**

   - Use the test project ID and API key
   - Try connecting via your application or a test script
   - Verify you can read/write to collections

2. **Check Permissions**
   - Ensure the API key has access to all collections
   - Verify storage buckets are accessible

## Step 9: Add to GitHub Secrets

Now that you have all the test credentials, add them to GitHub Secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add each secret using the test project values:
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT` = `https://cloud.appwrite.io/v1` (or your region)
   - `NEXT_PUBLIC_APPWRITE_PROJECT` = [your-test-project-id]
   - `NEXT_APPWRITE_API_KEY` = [your-test-api-key]
   - `NEXT_PUBLIC_APPWRITE_DATABASE` = [your-test-database-id]
   - All collection IDs from Step 3
   - Both bucket IDs from Step 4

## Step 10: Test the Setup

1. **Push a commit** or create a pull request
2. **Check GitHub Actions** workflow
3. **Verify** Playwright tests connect to your test Appwrite project
4. **Confirm** no "Project not found" errors

## Maintenance Tips

- **Regular Cleanup**: Periodically clean up test data
- **Reset Collections**: You can delete and recreate collections if needed
- **Monitor Usage**: Check Appwrite Console for test project activity
- **Rotate API Keys**: Rotate test API keys periodically (every 90 days)

## Troubleshooting

### "Project not found" error

- Verify the project ID in GitHub Secrets matches your test project
- Check that the endpoint URL is correct

### "Collection not found" error

- Verify all collection IDs are correct
- Ensure collections exist in the test database

### "Unauthorized" error

- Check that the API key has "Server" scope
- Verify the API key hasn't been revoked
- Ensure the API key belongs to the test project

### Tests failing due to missing data

- Add minimal test data to collections
- Or update tests to create their own test data

## Security Reminders

- ✅ Test project is separate from production
- ✅ Test API key has limited scope (Server only)
- ✅ Test data can be safely deleted/reset
- ✅ Test credentials are stored in GitHub Secrets (encrypted)
- ✅ Test project doesn't contain real user data

## Next Steps

After creating the test project:

1. ✅ Document all IDs in a secure location
2. ✅ Add all secrets to GitHub
3. ✅ Run a test workflow to verify connection
4. ✅ Update your team documentation with test project info

---

**Need Help?** If you encounter any issues, check the Appwrite documentation or review your production project structure for reference.
