import { NextRequest, NextResponse } from 'next/server';
import { Client, Account } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.secretKey);

const account = new Account(client);

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    // Note: This is a simplified implementation
    // In a real implementation, you would verify the TOTP code against the stored secret
    const isValid = await verifyTOTPCode(userId, code);

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '2FA verification successful',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}

// Simplified TOTP verification function
// In a real implementation, you would use a proper TOTP library
async function verifyTOTPCode(userId: string, code: string): Promise<boolean> {
  try {
    // For demo purposes, accept any 6-digit code
    // In production, you would:
    // 1. Retrieve the user's TOTP secret from the database
    // 2. Use a TOTP library to verify the code
    // 3. Check if the code is within the acceptable time window

    if (code.length === 6 && /^\d{6}$/.test(code)) {
      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in TOTP verification:', error);
    return false;
  }
}
