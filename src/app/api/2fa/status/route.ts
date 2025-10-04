import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
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

    const client = await createAdminClient();

    try {
      // Check if user has 2FA enabled by looking for stored 2FA data
      // In production, you would store this in a separate collection or user profile
      const userResponse = await client.tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.usersCollectionId,
        queries: [Query.equal('accountId', userId)],
      });

      if (userResponse.rows.length > 0) {
        const user = userResponse.rows[0];

        // Check if user has 2FA enabled according to the schema
        // All 4 fields must be populated for 2FA to be considered "enabled"
        const has2FA =
          user.twoFactorEnabled === true &&
          user.twoFactorSecret !== null &&
          user.twoFactorSecret !== undefined &&
          user.twoFactorFactorId !== null &&
          user.twoFactorFactorId !== undefined &&
          user.twoFactorSetupAt !== null &&
          user.twoFactorSetupAt !== undefined;

        return NextResponse.json({
          success: true,
          has2FA,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorSecret: user.twoFactorSecret,
          twoFactorFactorId: user.twoFactorFactorId,
          twoFactorSetupAt: user.twoFactorSetupAt,
        });
      } else {
        return NextResponse.json({
          success: true,
          has2FA: false,
        });
      }
    } catch (error) {
      console.error('Error fetching user from database:', error);

      // If we can't fetch from database, return false (no 2FA)
      return NextResponse.json({
        success: true,
        has2FA: false,
      });
    }
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}
