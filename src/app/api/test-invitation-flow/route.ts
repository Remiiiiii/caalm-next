import { NextRequest, NextResponse } from 'next/server';
import { mailgunService } from '@/lib/services/mailgun';
import { triggerNewUserRequestNotification } from '@/lib/utils/notificationTriggers';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, testType } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Email and fullName are required' },
        { status: 400 }
      );
    }

    switch (testType) {
      case 'account-request':
        // Test account request confirmation email
        await mailgunService.sendAccountRequestConfirmation(email, fullName);
        return NextResponse.json({
          success: true,
          message: 'Account request confirmation email sent',
        });

      case 'invitation':
        // Test invitation email
        const inviteLink = `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/invite/accept?token=test-token-123`;
        await mailgunService.sendInvitationEmail(
          email,
          fullName,
          inviteLink,
          'manager',
          'IT'
        );
        return NextResponse.json({
          success: true,
          message: 'Invitation email sent',
          inviteLink,
        });

      case 'executive-notification':
        // Test executive notification
        await triggerNewUserRequestNotification(email, fullName);
        return NextResponse.json({
          success: true,
          message: 'Executive notifications sent',
        });

      case 'complete-flow':
        // Test complete flow
        await mailgunService.sendAccountRequestConfirmation(email, fullName);
        await triggerNewUserRequestNotification(email, fullName);
        return NextResponse.json({
          success: true,
          message:
            'Complete flow test completed - user confirmation sent and executives notified',
        });

      case 'otp':
        // Test OTP email
        const { sendEmailOTP } = await import('@/lib/actions/user.actions');
        const userId = await sendEmailOTP({ email });
        return NextResponse.json({
          success: true,
          message: 'OTP email sent successfully',
          userId,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Test invitation flow error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test invitation flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Invitation Flow Test API',
    availableTests: [
      'account-request - Test account request confirmation email',
      'invitation - Test invitation email',
      'executive-notification - Test executive notification system',
      'complete-flow - Test complete signup to notification flow',
      'otp - Test OTP email sending',
    ],
    usage: 'POST with { email, fullName, testType }',
  });
}
