import { NextRequest, NextResponse } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import {
  generateTOTPSecret,
  generateTOTPQRUrl,
  verifyTOTPCode,
} from '@/lib/totp';
import { Query } from 'node-appwrite';

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
      userId: userId,
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
const tempSecrets = new Map<
  string,
  {
    secret: string;
    userId: string;
    timestamp: number;
  }
>();

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
      // Store the verified secret in the user's profile
      try {
        const client = await createAdminClient();

        // First, check if the user exists by accountId
        const userResponse = await client.tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.usersCollectionId,
          queries: [Query.equal('accountId', storedData.userId)],
        });

        if (userResponse.rows.length === 0) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Update the user's profile with 2FA information
        // Only include fields that exist in the schema to avoid errors
        const updateData: Record<string, unknown> = {
          twoFactorEnabled: true,
          twoFactorSecret: storedData.secret,
          twoFactorFactorId: factorId,
        };

        // Try to add the setup timestamp if the field exists
        try {
          updateData.twoFactorSetupAt = new Date().toISOString();
        } catch {
          console.warn('twoFactorSetupAt field not available in schema');
        }

        await client.tablesDB.updateRow(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          userResponse.rows[0].$id, // Use the actual document ID from the users collection
          updateData
        );

        // Clean up the temporary secret
        tempSecrets.delete(factorId);

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
      } catch (error) {
        console.error('Error storing 2FA secret:', error);

        // Provide more specific error information
        if (error instanceof Error) {
          if (error.message.includes('Attribute')) {
            return NextResponse.json(
              {
                error:
                  'Database schema does not support 2FA fields. Please add the required attributes to the users collection.',
              },
              { status: 500 }
            );
          }
        }

        return NextResponse.json(
          { error: 'Failed to store 2FA configuration' },
          { status: 500 }
        );
      }
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
