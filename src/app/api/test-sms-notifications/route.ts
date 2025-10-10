import { NextRequest, NextResponse } from 'next/server';
import {
  notifyOTPVerified,
  notifyInvitationSent,
  notifyInvitationAccepted,
  notify2FACompleted,
} from '@/lib/utils/smsNotifications';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    console.log(`Test: Triggering ${type} SMS notification`);

    switch (type) {
      case 'otp-verified':
        await notifyOTPVerified('test@example.com', 'Test User');
        break;

      case 'invitation-sent':
        await notifyInvitationSent(
          'newuser@example.com',
          'New User',
          'manager',
          'IT'
        );
        break;

      case 'invitation-accepted':
        await notifyInvitationAccepted(
          'newuser@example.com',
          'New User',
          'manager',
          'IT'
        );
        break;

      case '2fa-completed':
        await notify2FACompleted('test@example.com', 'Test User');
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} SMS notification sent successfully`,
    });
  } catch (error) {
    console.error('Test: Failed to send SMS notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
