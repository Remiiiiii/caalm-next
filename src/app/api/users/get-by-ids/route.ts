import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    console.log('[get-by-ids] Received request with userIds:', userIds);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty userIds array' },
        { status: 400 }
      );
    }

    // Validate configuration
    if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
      console.error('[get-by-ids] Missing configuration:', {
        databaseId: appwriteConfig.databaseId,
        usersCollectionId: appwriteConfig.usersCollectionId,
      });
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    console.log('[get-by-ids] Configuration:', {
      databaseId: appwriteConfig.databaseId,
      usersCollectionId: appwriteConfig.usersCollectionId,
    });

    const adminClient = await createAdminClient();
    const users: any[] = [];
    const foundUserIds = new Set<string>();

    // Fetch users - use getRow for single IDs, listRows for queries
    for (const userId of userIds) {
      if (foundUserIds.has(userId)) continue; // Skip if already found

      try {
        // First try to get by document ID ($id) using getRow (most direct)
        try {
          console.log(`[get-by-ids] Fetching user by rowId: ${userId}`);
          const user = await adminClient.tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.usersCollectionId,
            rowId: userId,
          });

          if (user) {
            console.log(`[get-by-ids] Found user ${userId}:`, {
              $id: user.$id,
              fullName: user.fullName,
              email: user.email,
            });
            users.push({
              $id: user.$id,
              accountId: user.accountId,
              fullName: user.fullName,
              email: user.email,
            });
            foundUserIds.add(userId);
            continue; // Found by $id, move to next
          }
        } catch (getRowError: any) {
          // getRow returns 404 if not found, which is expected
          if (
            getRowError?.code === 404 ||
            getRowError?.message?.includes('not found')
          ) {
            console.log(
              `[get-by-ids] User not found with $id: ${userId}, trying accountId...`
            );
          } else {
            console.warn(
              `[get-by-ids] Error fetching user ${userId} by $id:`,
              getRowError?.message || getRowError
            );
          }
        }

        // If not found by $id, try accountId using listRows
        try {
          const accountIdResponse = await adminClient.tablesDB.listRows(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [Query.equal('accountId', userId), Query.limit(1)]
          );

          if (accountIdResponse.rows && accountIdResponse.rows.length > 0) {
            const user = accountIdResponse.rows[0];
            // Only add if not already added (avoid duplicates)
            if (!foundUserIds.has(user.$id)) {
              console.log(`[get-by-ids] Found user by accountId ${userId}:`, {
                $id: user.$id,
                fullName: user.fullName,
              });
              users.push({
                $id: user.$id,
                accountId: user.accountId,
                fullName: user.fullName,
                email: user.email,
              });
              foundUserIds.add(user.$id);
            }
          }
        } catch (accountIdError: any) {
          console.warn(
            `[get-by-ids] Error fetching user ${userId} by accountId:`,
            accountIdError?.message || accountIdError
          );
        }
      } catch (error: any) {
        console.error(
          `[get-by-ids] Error fetching user ${userId}:`,
          error?.message || error
        );
        // Continue to next user
      }
    }

    console.log(
      `[get-by-ids] Returning ${users.length} users for ${userIds.length} requested IDs`
    );
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
