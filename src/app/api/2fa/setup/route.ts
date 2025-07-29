import { NextRequest, NextResponse } from 'next/server';
// import { Client, Users } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import {
  generateTOTPSecret,
  generateTOTPQRUrl,
  verifyTOTPCode,
} from '@/lib/totp';

// const client = new Client()
//   .setEndpoint(appwriteConfig.endpointUrl)
//   .setProject(appwriteConfig.projectId)
//   .setKey(appwriteConfig.secretKey);

// const users = new Users(client); // Will be used when implementing actual user lookup

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if we have proper Appwrite configuration
    if (!appwriteConfig.secretKey) {
      console.error('Appwrite secret key is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate TOTP secret
    const secret = generateTOTPSecret();

    // For demo purposes, use a mock user email
    // In production, you would get this from Appwrite Auth
    const accountName = 'user@example.com';

    // Generate QR code URL
    const qrUrl = generateTOTPQRUrl(secret, accountName, 'CAALM');

    // Store the secret temporarily (in production, you'd store this securely)
    const factorId = `totp_${userId}_${Date.now()}`;

    // Store the secret in temporary storage for verification
    tempSecrets.set(factorId, {
      secret: secret,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: {
        uri: qrUrl,
        secret: secret,
        factorId: factorId,
      },
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
}

// In-memory storage for demo purposes (in production, use a database)
const tempSecrets = new Map<string, { secret: string; timestamp: number }>();

// Cleanup expired secrets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [factorId, data] of tempSecrets.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) {
      // 5 minutes
      tempSecrets.delete(factorId);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

export async function PUT(request: NextRequest) {
  try {
    const { factorId, code } = await request.json();

    if (!factorId || !code) {
      return NextResponse.json(
        { error: 'Factor ID and verification code are required' },
        { status: 400 }
      );
    }

    // Get the secret from temporary storage
    const storedData = tempSecrets.get(factorId);
    if (!storedData) {
      return NextResponse.json(
        { error: 'Invalid or expired setup session' },
        { status: 400 }
      );
    }

    // Check if the setup session is still valid (5 minutes)
    const now = Date.now();
    if (now - storedData.timestamp > 5 * 60 * 1000) {
      tempSecrets.delete(factorId);
      return NextResponse.json(
        { error: 'Setup session expired. Please try again.' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(storedData.secret, code);

    if (isValid) {
      // Clean up the temporary secret
      tempSecrets.delete(factorId);

      // In production, you would:
      // 1. Store the verified secret securely in your database
      // 2. Mark the user as having 2FA enabled
      // 3. Create a session or token

      const response = NextResponse.json({
        success: true,
        message: '2FA setup completed successfully',
      });

      // Set cookie to indicate 2FA is completed
      response.cookies.set('2fa_completed', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to update 2FA' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { factorId } = await request.json();

    if (!factorId) {
      return NextResponse.json(
        { error: 'Factor ID is required' },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Remove the stored secret
    // 2. Mark the user as not having 2FA enabled

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
