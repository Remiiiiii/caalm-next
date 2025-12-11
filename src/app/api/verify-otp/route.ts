import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/actions/user.actions';

export async function POST(request: NextRequest) {
  try {
    const { email, otp, accountId } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Verify the OTP (optimized with caching)
    const result = await verifyOTP({ email, otp, accountId });

    if (result?.success) {
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        accountId: result.accountId,
      });
    } else {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OTP verification error:', error);
    }
    return NextResponse.json(
      {
        error: 'Failed to verify OTP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OTP Verification API',
    usage: 'POST with { email, otp }',
    example: {
      email: 'support@caalmsolutions.com',
      otp: '123456',
    },
  });
}
