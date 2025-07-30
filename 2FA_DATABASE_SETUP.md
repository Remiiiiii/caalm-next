# 2FA Database Setup Guide

To enable 2FA functionality in your Caalm application, you need to add the following attributes to your users collection in Appwrite and create a new collection for OTP tokens.

## Required Database Attributes

Add these attributes to your `users` collection in the Appwrite console:

### 1. twoFactorEnabled (Boolean)

- **Type**: Boolean
- **Required**: No (default: false)
- **Description**: Indicates whether 2FA is enabled for the user

### 2. twoFactorSecret (String)

- **Type**: String
- **Required**: No
- **Size**: 32 characters
- **Description**: Stores the TOTP secret key for generating verification codes
- **Security**: This should be encrypted in production

### 3. twoFactorFactorId (String)

- **Type**: String
- **Required**: No
- **Size**: 64 characters
- **Description**: Unique identifier for the 2FA factor

### 4. twoFactorSetupAt (DateTime)

- **Type**: DateTime
- **Required**: No
- **Description**: Timestamp when 2FA was first set up

## OTP Tokens Collection

Create a new collection called `otp_tokens` for storing email OTP codes:

### 1. email (String)

- **Type**: String
- **Required**: Yes
- **Size**: 255 characters
- **Description**: The email address the OTP was sent to

### 2. otp (String)

- **Type**: String
- **Required**: Yes
- **Size**: 6 characters
- **Description**: The 6-digit OTP code

### 3. expiresAt (DateTime)

- **Type**: DateTime
- **Required**: Yes
- **Description**: When the OTP expires (5 minutes from creation)

### 4. used (Boolean)

- **Type**: Boolean
- **Required**: Yes
- **Default**: false
- **Description**: Whether the OTP has been used

## Authentication Flow

### Initial User Creation

- When a user document is created, all 2FA fields are set to `null`:
  - `twoFactorEnabled`: null
  - `twoFactorSecret`: null
  - `twoFactorFactorId`: null
  - `twoFactorSetupAt`: null

### First-Time Sign-in (NEW USER)

1. **Email OTP verification** (always required first step)
2. System detects all 4 2FA fields are `null` → triggers QR setup modal
3. User completes QR/TOTP setup → updates all 4 fields:
   - `twoFactorEnabled`: true
   - `twoFactorSecret`: [generated secret]
   - `twoFactorFactorId`: [unique ID]
   - `twoFactorSetupAt`: [current timestamp]
4. Redirect to dashboard

### Subsequent Sign-ins (EXISTING USER)

1. **Email OTP verification** (AlertDialog - always required)
2. **TOTP verification** (simple dialog - always required)
3. **Never show QR setup modal again**
4. Redirect to dashboard after both verifications

### State Transitions

- **Initial state**: All 2FA fields = `null`
- **After QR setup**: All fields populated with proper values
- **QR setup modal ONLY shows when all 4 fields are `null`**
- **Sequential verification (OTP → TOTP) ALWAYS required post-setup**
- **No "Dual Authentication Required" modal for existing users**

### Error Handling

- **Failed TOTP verification**: Allow retries (3 attempts), show error message
- **Failed OTP verification**: Same handling as TOTP failures
- **Do not proceed to dashboard** until both verifications succeed

## How to Add These Attributes

### Users Collection

1. Go to your Appwrite Console
2. Navigate to Databases → Your Database → Users Collection
3. Click on "Add Attribute" for each 2FA field above
4. Configure each attribute as specified above
5. Save the changes

### OTP Tokens Collection

1. In the same database, create a new collection called `otp_tokens`
2. Add the four attributes listed above (email, otp, expiresAt, used)
3. Configure each attribute as specified
4. Save the changes

## Testing the Setup

After adding these attributes, you can test the 2FA flow using the improved test page:

1. Visit `/test-2fa` in your application
2. The page will automatically fetch existing users from your database
3. You can either:
   - Select an existing user to test with
   - Create a new test user using the form
4. For users without 2FA: Click "Test 2FA Setup Flow" to test the QR code setup
5. For users with 2FA: Click "Test 2FA Verification Flow" to test the verification process
6. The page will show the current 2FA status for each user

### Test Page Features

- **User Selection**: Choose from existing users in your database
- **Create Test Users**: Add new test users with custom email and name
- **Real-time Status**: See which users have 2FA enabled
- **Automatic Refresh**: User list updates after 2FA setup
- **Fallback Testing**: Works even if database attributes are missing (for development)

## Troubleshooting

### "Database schema does not support 2FA fields"

This error means one or more of the required attributes are missing from your users collection. Follow the steps above to add them.

### "OTP Tokens collection not found"

This error occurs when the `otp_tokens` collection is missing. Create the collection and add the required attributes as described above.

### "User not found"

This error occurs when trying to test with a user ID that doesn't exist in your database. Use the test page to select or create valid users.

### Testing Without Database Setup

For development purposes, the verification API includes a fallback mode that accepts any 6-digit code when the user doesn't exist in the database. This allows testing the UI flow even before the database is fully configured.

## Security Notes

- The `twoFactorSecret` field contains sensitive data and should be encrypted
- Consider implementing additional security measures like backup codes
- Regularly audit 2FA usage and compliance
- The fallback testing mode should be disabled in production
