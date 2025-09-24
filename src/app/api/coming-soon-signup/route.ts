import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    console.log('Coming Soon Signup:', email);

    // Send confirmation email to the user
    const { mailgunService } = await import('@/lib/services/mailgun');

    try {
      // Send confirmation email to the user
      await mailgunService.sendComingSoonConfirmation(email);
      console.log('Confirmation email sent to:', email);

      // Notify the team about the new signup
      await mailgunService.notifyTeamOfNewSignup(email);
      console.log('Team notification sent for signup:', email);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email sending fails
      // The signup is still valid, just email delivery failed
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! We'll notify you when we launch.",
    });
  } catch (error) {
    console.error('Coming soon signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
