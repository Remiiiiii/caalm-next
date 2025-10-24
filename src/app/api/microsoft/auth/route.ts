import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl, validateConfig } from '@/lib/microsoft/oauth';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getRedirectUri } from '@/lib/config/environment';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    validateConfig();

    // Get current user ID
    let userId: string;

    try {
      userId = await getCurrentUserId();
    } catch (authError) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message:
            'Please log in to your CAALM account first before connecting Microsoft Outlook',
          action: 'login',
        },
        { status: 401 }
      );
    }

    // Generate state parameter for CSRF protection with user ID
    const state = `${userId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;

    // Store state in cookie for validation
    const cookieStore = await cookies();
    cookieStore.set('microsoft-oauth-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Generate authorization URL
    const authUrl = generateAuthUrl(state);

    // Redirect to Microsoft OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error);

    if (error instanceof Error && error.message.includes('Missing required')) {
      return NextResponse.json(
        {
          error: 'Microsoft OAuth not configured',
          details: error.message,
          setup: {
            message: 'Please configure the following environment variables:',
            variables: [
              'MICROSOFT_CLIENT_ID',
              'MICROSOFT_CLIENT_SECRET',
              'NEXT_PUBLIC_REDIRECT_URI',
            ],
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to initiate Microsoft OAuth',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
      },
      { status: 500 }
    );
  }
}
