# Work/School Account Setup Guide for Microsoft Calendar Integration

## Problem Identified

Your current Microsoft account (`victorram1_hotmail.com#EXT#@victorram1hotmail.onmicrosoft.com`) is a **personal Microsoft account** that was added to an Azure AD tenant. Personal accounts have **limited calendar access** in Azure AD tenants, which is why all calendar API calls are failing with 401 Unauthorized errors.

## Solution: Use a Work/School Account

### Option A: Create a New Work/School Account (Recommended)

1. **Go to Microsoft 365 Admin Center**

   - Visit: https://admin.microsoft.com
   - Sign in with your current account

2. **Create a New User Account**

   - Go to "Users" → "Active users"
   - Click "Add a user"
   - Create a new user with a work email (e.g., `victor@yourcompany.com`)
   - Assign appropriate licenses (Microsoft 365 Business Basic or higher)

3. **Use the New Account for Calendar Integration**
   - Sign out of your current personal account
   - Sign in with the new work/school account
   - Connect the calendar integration using this account

### Option B: Use an Existing Work/School Account

If you already have a work or school Microsoft account:

1. **Sign out of your current personal account**
2. **Sign in with your work/school account**
3. **Connect the calendar integration using this account**

### Option C: Create a Test Tenant (For Development)

If you don't have access to a work/school account:

1. **Sign up for Microsoft 365 Developer Program**

   - Visit: https://developer.microsoft.com/en-us/microsoft-365/dev-program
   - Get a free Microsoft 365 E5 subscription for development
   - This gives you a full Azure AD tenant with work accounts

2. **Create a Test User**
   - Use the developer tenant to create a test user
   - This user will have full calendar access

## Step-by-Step Implementation

### 1. Disconnect Current Account

```bash
# The current personal account has been disconnected
# You can verify this by checking the calendar settings in your app
```

### 2. Prepare New Work/School Account

- Ensure the account has a valid mailbox
- Verify the account can access Outlook calendar
- Note the account's email address

### 3. Update Azure App Registration (If Needed)

If you're using a different tenant, you may need to:

1. **Go to Azure Portal** → **App registrations**
2. **Select your app** (CAALM)
3. **Go to "Authentication"**
4. **Add the new tenant's domain** to "Redirect URIs" if needed
5. **Update "Supported account types"** if switching tenant types

### 4. Test the New Account

1. **Sign in with the work/school account**
2. **Go to your CAALM app**
3. **Navigate to Calendar Settings**
4. **Click "Connect Microsoft Calendar"**
5. **Complete the OAuth flow**
6. **Test calendar sync**

## Verification Steps

After connecting the work/school account:

1. **Check Account Type**

   ```
   Visit: http://localhost:3000/api/microsoft/account-type-check
   ```

   - Should show `account_type: "Work/School Account"`
   - Should show `calendar_access_issue: "Should have full calendar access"`

2. **Test Calendar Access**

   ```
   Visit: http://localhost:3000/api/microsoft/test-permissions
   ```

   - All calendar tests should pass
   - No more 401 Unauthorized errors

3. **Test Sync**
   - Go to Calendar Settings
   - Click "Sync Now"
   - Should successfully sync Outlook events to CAALM

## Expected Results

With a work/school account, you should see:

- ✅ **Account Type**: "Work/School Account"
- ✅ **Calendar Access**: Full access to all calendar APIs
- ✅ **Sync Success**: Outlook events appear in CAALM calendar
- ✅ **No 401 Errors**: All API calls succeed

## Troubleshooting

If you still encounter issues:

1. **Check Tenant Policies**

   - Ensure the tenant allows calendar access
   - Verify no conditional access policies are blocking access

2. **Verify App Permissions**

   - Ensure the app has the required permissions
   - Check that admin consent was granted

3. **Test with Different Account**
   - Try with a different work/school account
   - Verify the account has a valid mailbox

## Next Steps

1. **Choose your preferred option** (A, B, or C above)
2. **Set up the work/school account**
3. **Disconnect the current personal account** (already done)
4. **Connect the new work/school account**
5. **Test the calendar integration**

The work/school account will have full calendar access and should resolve all the 401 Unauthorized errors you're currently experiencing.
