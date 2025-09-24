import { NextRequest, NextResponse } from 'next/server';
import { mailgunService } from '@/lib/services/mailgun';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a test OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send test OTP email
    await mailgunService.sendOTPEmail(email, otp, fullName);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      otp: otp, // Only for testing - remove in production
    });
  } catch (error) {
    console.error('Test Mailgun error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
