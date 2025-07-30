# Inactivity Timer Feature

## Overview

The Inactivity Timer feature automatically logs out users after a period of inactivity to enhance security. It monitors user activity and shows a warning dialog with a countdown timer before logging out.

## Features

- **10-minute inactivity limit** (configurable)
- **30-second countdown timer** (configurable)
- **Activity monitoring** for mouse, keyboard, touch, and scroll events
- **Themed AlertDialog** with clear action buttons
- **Development mode** with shorter timers for testing
- **Configurable settings** for different environments

## Implementation

### Components

1. **InactivityDialog** (`src/components/InactivityDialog.tsx`)

   - Shows the warning dialog with countdown
   - Provides "Continue Session" and "Sign Out" options
   - Automatically logs out when countdown reaches zero

2. **useInactivityTimer Hook** (`src/hooks/useInactivityTimer.ts`)

   - Manages timer logic and event listeners
   - Handles activity detection and timer reset
   - Provides dialog state and action handlers

3. **Configuration** (`src/lib/inactivity-config.ts`)
   - Centralized configuration for all timer settings
   - Environment-specific settings (development vs production)
   - Helper functions for time formatting

### Integration

The inactivity timer is integrated into the `AuthenticatedLayout` component, ensuring it's active on all authenticated pages.

## Configuration

### Timer Settings

```typescript
export const INACTIVITY_CONFIG = {
  // Inactivity limit before showing dialog (in milliseconds)
  INACTIVITY_LIMIT: 600000, // 10 minutes

  // Countdown time in dialog (in milliseconds)
  COUNTDOWN_TIME: 30000, // 30 seconds

  // Events to monitor for user activity
  MONITORED_EVENTS: ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'],

  // Whether to enable the inactivity timer
  ENABLED: true,

  // Development mode - shorter timers for testing
  DEV_MODE: process.env.NODE_ENV === 'development',

  // Development timers (when DEV_MODE is true)
  DEV_INACTIVITY_LIMIT: 30000, // 30 seconds for testing
  DEV_COUNTDOWN_TIME: 10000, // 10 seconds for testing
};
```

### Environment-Specific Settings

- **Production**: 10-minute inactivity, 30-second countdown
- **Development**: 30-second inactivity, 10-second countdown (for testing)

## Usage

### Basic Implementation

```typescript
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import InactivityDialog from '@/components/InactivityDialog';

function MyComponent() {
  const { showDialog, handleContinue, handleLogout, handleClose } =
    useInactivityTimer();

  return (
    <div>
      {/* Your component content */}

      <InactivityDialog
        isOpen={showDialog}
        onClose={handleClose}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </div>
  );
}
```

### Custom Configuration

```typescript
// Modify src/lib/inactivity-config.ts for custom settings
export const INACTIVITY_CONFIG = {
  INACTIVITY_LIMIT: 300000, // 5 minutes
  COUNTDOWN_TIME: 15000, // 15 seconds
  // ... other settings
};
```

## Testing

### Test Page

Visit `/test-inactivity` to test the inactivity timer functionality:

- **Activity Log**: See recent user activity events
- **Test Buttons**: Simulate different types of user activity
- **Timer Information**: View current timer settings
- **Instructions**: Step-by-step testing guide

### Development Testing

In development mode, the timers are shortened for easier testing:

- **Inactivity Limit**: 30 seconds
- **Countdown Time**: 10 seconds

### Manual Testing

1. Navigate to any authenticated page
2. Stay inactive for the configured time limit
3. The inactivity dialog will appear
4. Test both "Continue Session" and "Sign Out" options

## Event Monitoring

The inactivity timer monitors the following user activities:

- **Mouse Movements**: Any mouse movement across the page
- **Keyboard Presses**: Any key press events
- **Clicks/Touches**: Mouse clicks and touch events
- **Scroll Events**: Page scrolling and wheel events

## Security Features

- **Automatic Logout**: Forces logout after countdown expires
- **Session Cleanup**: Clears localStorage and sessionStorage on logout
- **Activity Reset**: Timer resets on any user activity
- **Dialog Prevention**: Prevents timer reset while dialog is open

## Customization

### Styling

The `InactivityDialog` component uses Tailwind CSS classes and can be customized by modifying the component styles.

### Behavior

Modify the `useInactivityTimer` hook to change:

- Event monitoring behavior
- Timer reset logic
- Logout handling
- Activity detection rules

### Configuration

Update `src/lib/inactivity-config.ts` to change:

- Timer durations
- Monitored events
- Environment settings
- Feature enable/disable

## Troubleshooting

### Timer Not Working

1. Check if `INACTIVITY_CONFIG.ENABLED` is set to `true`
2. Verify event listeners are properly attached
3. Check browser console for errors
4. Ensure component is mounted in authenticated layout

### Dialog Not Appearing

1. Verify timer configuration is correct
2. Check if user activity is being detected
3. Ensure dialog component is properly rendered
4. Check for CSS conflicts hiding the dialog

### Performance Issues

1. Event listeners use `passive: true` for better performance
2. Timer cleanup is handled automatically
3. Activity detection is throttled to prevent excessive calls

## Browser Compatibility

The inactivity timer works in all modern browsers that support:

- `setTimeout` and `setInterval`
- `addEventListener` with passive option
- ES6+ features (const, arrow functions, etc.)

## Future Enhancements

Potential improvements for the inactivity timer:

- **User Preferences**: Allow users to configure their own timeout
- **Warning Notifications**: Show subtle warnings before the main dialog
- **Activity Analytics**: Track user activity patterns
- **Multi-tab Support**: Synchronize inactivity state across tabs
- **Custom Events**: Allow custom activity events to be monitored
