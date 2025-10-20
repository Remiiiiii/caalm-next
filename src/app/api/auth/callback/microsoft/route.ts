import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getUserInfo,
  calculateTokenExpiry,
} from '@/lib/microsoft/oauth';
import { createCalendarIntegration } from '@/lib/actions/calendar-integration.actions';
import { createSessionClient } from '@/lib/appwrite';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard?error=microsoft_oauth_${error}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard?error=missing_parameters`
      );
    }

    // Validate state parameter for CSRF protection
    const cookieStore = await cookies();
    const storedState = cookieStore.get('microsoft-oauth-state')?.value;

    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter:', {
        received: state,
        stored: storedState,
      });
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard?error=invalid_state`
      );
    }

    // Clear the state cookie
    cookieStore.delete('microsoft-oauth-state');

    // Get current user session
    const sessionClient = await createSessionClient();
    const account = await sessionClient.account.get();

    if (!account) {
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard?error=no_session`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, state);

    // Get user information from Microsoft Graph
    const userInfo = await getUserInfo(tokens.access_token);

    // Calculate token expiry
    const tokenExpiry = calculateTokenExpiry(tokens.expires_in);

    // Store integration in database
    await createCalendarIntegration({
      user_id: account.$id,
      provider: 'microsoft',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokenExpiry.toISOString(),
      sync_enabled: true,
    });

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }/dashboard?success=microsoft_connected&user=${encodeURIComponent(
        userInfo.displayName
      )}`
    );
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);

    let errorMessage = 'unknown_error';

    if (error instanceof Error) {
      if (error.message.includes('Token exchange failed')) {
        errorMessage = 'token_exchange_failed';
      } else if (error.message.includes('Failed to get user info')) {
        errorMessage = 'user_info_failed';
      } else if (
        error.message.includes('Error creating calendar integration')
      ) {
        errorMessage = 'integration_creation_failed';
      }
    }

    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }/dashboard?error=microsoft_callback_${errorMessage}`
    );
  }
}
