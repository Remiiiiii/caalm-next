import { NextResponse } from 'next/server';
import { initializeCalendarNotificationTypes } from '@/lib/actions/calendar-notification-types';

/**
 * Initialize calendar notification types in the database
 * This endpoint ensures all calendar notification types (including calendar_shared) are created
 */
export async function POST() {
  try {
    console.log('[SERVER] /api/notification-types/initialize] Initializing calendar notification types...');
    await initializeCalendarNotificationTypes();
    console.log('[SERVER] /api/notification-types/initialize] Successfully initialized calendar notification types');
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Calendar notification types initialized successfully' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SERVER] /api/notification-types/initialize] Error initializing notification types:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initialize notification types',
      },
      { status: 500 }
    );
  }
}

