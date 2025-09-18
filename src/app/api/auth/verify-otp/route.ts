import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const client = await createAdminClient();

    // Find the OTP token
    const otpResponse = await client.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.otpTokensCollectionId,
      queries: [
        Query.equal('email', email),
        Query.equal('otp', otp),
        Query.equal('used', false),
      ],
    });

    if (otpResponse.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    const otpToken = otpResponse.rows[0];

    // Check if OTP is expired
    const expirationTime = new Date(otpToken.expiresAt);
    const currentTime = new Date();

    if (currentTime > expirationTime) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Mark OTP as used
    await client.tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.otpTokensCollectionId,
      rowId: otpToken.$id,
      data: {
        used: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
