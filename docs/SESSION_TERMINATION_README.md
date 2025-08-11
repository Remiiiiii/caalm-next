# Session Termination on Inactivity Logout

## Overview

This implementation provides a comprehensive session termination system that ensures users are properly logged out when their session expires due to inactivity. The system includes both server-side session invalidation and client-side cleanup to prevent unauthorized access.

## Features

### 🔒 Complete Session Termination

- **Server-side invalidation**: Sessions are properly deleted from Appwrite
- **Client-side cleanup**: All auth-related data is cleared from browser storage
- **Cookie management**: All authentication cookies are removed
- **Middleware protection**: Routes are protected with session validation

### ⏰ Inactivity Detection

- **Configurable timers**: 10-minute inactivity limit with 30-second countdown
- **Activity monitoring**: Tracks mouse, keyboard, click, and scroll events
- **Visual feedback**: Countdown dialog with clear messaging
- **Graceful handling**: Users can continue session or sign out immediately

### 🛡️ Security Features

- **Session validation**: Real-time session checks via API
- **Route protection**: Middleware validates sessions on protected routes
- **Manual navigation blocking**: Invalid sessions redirect to login
- **Error handling**: Graceful fallbacks for network issues

## Implementation Details

### 1. Enhanced Logout API (`/api/auth/logout`)

```typescript
// Supports reason-based logout
POST /api/auth/logout
{
  "reason": "inactivity" | "manual"
}
```

**Features:**

- Deletes session from Appwrite
- Clears all auth cookies
- Sets temporary logout reason cookie
- Returns appropriate success/error responses

### 2. Session Validation API (`/api/auth/session`)

```typescript
// Validates current session
GET / api / auth / session;
```

**Response:**

```json
{
  "valid": true,
  "user": {
    "$id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### 3. Enhanced AuthContext

**New Features:**

- `isSessionValid` state tracking
- Reason-based logout (`logout('inactivity')`)
- Automatic redirects with appropriate messages
- Client-side storage cleanup

### 4. Inactivity Timer Hook

**Enhanced Features:**

- Integrates with AuthContext
- Only runs when session is valid
- Proper cleanup on session changes
- Async logout handling

### 5. Middleware Protection

**Route Protection:**

- Validates sessions on protected routes
- Handles logout reason cookies
- Redirects invalid sessions to login
- Provides appropriate error messages

## User Experience Flow

### 1. Inactivity Detection

```
User inactive for 10 minutes → Show countdown dialog
```

### 2. Countdown Dialog

```
30-second countdown with options:
- "Continue Session" → Reset timer
- "Sign Out Now" → Immediate logout
```

### 3. Session Termination

```
Logout triggered → Server-side invalidation → Client cleanup → Redirect to login
```

### 4. Login Page

```
Redirect with reason parameter → Display appropriate message
```

## Configuration

### Inactivity Timer Settings (`src/lib/inactivity-config.ts`)

```typescript
export const INACTIVITY_CONFIG = {
  ENABLED: true,
  INACTIVITY_LIMIT: 600000, // 10 minutes
  COUNTDOWN_TIME: 30000, // 30 seconds
  MONITORED_EVENTS: ['mousemove', 'keydown', 'click', 'scroll'],
};
```

### Protected Routes (Middleware)

The following routes are protected with session validation:

- `/dashboard/*`
- `/contracts/*`
- `/licenses/*`
- `/analytics/*`
- `/uploads/*`
- `/images/*`
- `/media/*`
- `/others/*`
- `/audits/*`
- `/team/*`

## Security Considerations

### 1. Session Invalidation

- **Appwrite session deletion**: Ensures server-side session termination
- **Cookie cleanup**: Removes all authentication cookies
- **Client storage**: Clears localStorage and sessionStorage

### 2. Route Protection

- **Middleware validation**: Every protected route validates session
- **Real-time checks**: API calls verify session status
- **Graceful fallbacks**: Network errors redirect to login

### 3. Error Handling

- **Network failures**: Fallback to client-side logout
- **API errors**: Graceful degradation with user feedback
- **Session conflicts**: Automatic cleanup and redirect

## API Endpoints

### POST `/api/auth/logout`

**Purpose**: Logout user with reason tracking
**Body**: `{ "reason": "inactivity" | "manual" }`
**Response**: `{ "success": true, "reason": "inactivity", "message": "..." }`

### GET `/api/auth/session`

**Purpose**: Validate current session
**Response**: `{ "valid": true, "user": {...} }` or `{ "valid": false, "reason": "..." }`

## Error Messages

### Logout Reasons

- `inactivity`: "Your session expired due to inactivity. Please sign in again."
- `session_expired`: "Your session has expired. Please sign in again."
- `validation_error`: "Session validation failed. Please sign in again."

### URL Parameters

- `?reason=inactivity`: Shows inactivity logout message
- `?reason=session_expired`: Shows session expiration message
- `?reason=validation_error`: Shows validation error message

## Testing

### Manual Testing

1. **Inactivity Test**: Leave page inactive for 10+ minutes
2. **Countdown Test**: Verify 30-second countdown works
3. **Continue Session**: Test session continuation
4. **Manual Logout**: Test immediate logout
5. **Route Protection**: Try accessing protected routes with invalid session

### Automated Testing

```typescript
// Test session validation
const sessionStatus = await validateSession();
expect(sessionStatus.valid).toBe(true);

// Test logout
const logoutSuccess = await logoutUser('inactivity');
expect(logoutSuccess).toBe(true);
```

## Troubleshooting

### Common Issues

1. **Session not invalidating**

   - Check Appwrite session deletion
   - Verify cookie cleanup
   - Check client-side storage

2. **Middleware not working**

   - Verify route protection configuration
   - Check session validation API
   - Review error handling

3. **Inactivity timer not triggering**
   - Check INACTIVITY_CONFIG.ENABLED
   - Verify event listeners
   - Check session validity state

### Debug Mode

Enable debug logging in development:

```typescript
// Add to components for debugging
console.log('Session status:', isSessionValid);
console.log('Timer state:', showDialog);
```

## Future Enhancements

1. **Session Refresh**: Implement token refresh for long sessions
2. **Activity Analytics**: Track user activity patterns
3. **Custom Timeouts**: User-configurable inactivity limits
4. **Multi-tab Sync**: Synchronize logout across browser tabs
5. **Audit Logging**: Log session termination events

## Dependencies

- **Appwrite**: Session management
- **Next.js**: Middleware and API routes
- **React**: Context and hooks
- **date-fns**: Timer utilities
- **Lucide React**: Icons

## Files Modified

1. `src/app/api/auth/logout/route.ts` - Enhanced logout API
2. `src/app/api/auth/session/route.ts` - New session validation API
3. `src/contexts/AuthContext.tsx` - Enhanced auth context
4. `src/hooks/useInactivityTimer.ts` - Enhanced inactivity timer
5. `src/components/InactivityDialog.tsx` - Enhanced dialog
6. `src/components/AuthForm.tsx` - Logout message handling
7. `src/middleware.ts` - Route protection
8. `src/lib/auth-utils.ts` - New utility functions

This implementation ensures complete session termination and prevents unauthorized access while providing a smooth user experience.
