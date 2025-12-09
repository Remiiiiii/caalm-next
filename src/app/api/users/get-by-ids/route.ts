import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { CACHE_KEYS, getTTLForRoute } from '@/lib/services/cache-keys';
import * as cache from '@/lib/services/redis-cache';

/**
 * Fetch a single user by ID, accountId, or fullName with caching
 */
async function fetchUserByIdentifier(
  identifier: string,
  adminClient: any
): Promise<any | null> {
  // Try individual cache keys first for better hit rates
  let cachedUser = await cache.get(CACHE_KEYS.users.single(identifier));
  if (cachedUser) return cachedUser;

  cachedUser = await cache.get(CACHE_KEYS.users.byAccountId(identifier));
  if (cachedUser) return cachedUser;

  cachedUser = await cache.get(CACHE_KEYS.users.byFullName(identifier));
  if (cachedUser) return cachedUser;

  // User not in cache, fetch from database
  try {
    // First try to get by document ID ($id) using getRow (most direct)
    try {
      const user = await adminClient.tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.usersCollectionId,
        rowId: identifier,
      });

      if (user) {
        const userData = {
          $id: user.$id,
          accountId: user.accountId,
          fullName: user.fullName,
          email: user.email,
          profileImageId: user.profileImageId || null,
        };

        // Cache by all identifiers for future lookups
        const ttl = getTTLForRoute('users/get-by-ids');
        await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
        if (user.accountId) {
          await cache.set(CACHE_KEYS.users.byAccountId(user.accountId), userData, ttl);
        }
        if (user.fullName) {
          await cache.set(CACHE_KEYS.users.byFullName(user.fullName), userData, ttl);
        }

        return userData;
      }
    } catch (getRowError: any) {
      // getRow returns 404 if not found, which is expected - continue to next lookup method
    }

    // If not found by $id, try accountId using listRows
    try {
      const accountIdResponse = await adminClient.tablesDB.listRows(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal('accountId', identifier), Query.limit(1)]
      );

      if (accountIdResponse.rows && accountIdResponse.rows.length > 0) {
        const user = accountIdResponse.rows[0];
        const userData = {
          $id: user.$id,
          accountId: user.accountId,
          fullName: user.fullName,
          email: user.email,
          profileImageId: user.profileImageId || null,
        };

        // Cache by all identifiers
        const ttl = getTTLForRoute('users/get-by-ids');
        await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
        if (user.accountId) {
          await cache.set(CACHE_KEYS.users.byAccountId(user.accountId), userData, ttl);
        }
        if (user.fullName) {
          await cache.set(CACHE_KEYS.users.byFullName(user.fullName), userData, ttl);
        }

        return userData;
      }
    } catch (accountIdError: any) {
      // Continue to next lookup method
    }

    // If not found by $id or accountId, try fullName (assignedManagers might be stored as names)
    try {
      const nameResponse = await adminClient.tablesDB.listRows(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal('fullName', identifier), Query.limit(1)]
      );

      if (nameResponse.rows && nameResponse.rows.length > 0) {
        const user = nameResponse.rows[0];
        const userData = {
          $id: user.$id,
          accountId: user.accountId,
          fullName: user.fullName,
          email: user.email,
          profileImageId: user.profileImageId || null,
        };

        // Cache by all identifiers
        const ttl = getTTLForRoute('users/get-by-ids');
        await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
        if (user.accountId) {
          await cache.set(CACHE_KEYS.users.byAccountId(user.accountId), userData, ttl);
        }
        if (user.fullName) {
          await cache.set(CACHE_KEYS.users.byFullName(user.fullName), userData, ttl);
        }

        return userData;
      }
    } catch (nameError: any) {
      // Continue - user not found by any method
    }
  } catch (error: any) {
    // Error fetching user - return null
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

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

    // Check cache for the entire batch first
    const cacheKey = CACHE_KEYS.users.byIds(userIds);
    const cachedResult = await cache.get<any[]>(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Fetch users using individual caching
    const adminClient = await createAdminClient();
    const users: any[] = [];
    const foundUserIds = new Set<string>();

    // Fetch users - check cache first, then database
    for (const userId of userIds) {
      if (foundUserIds.has(userId)) continue; // Skip if already found

      const user = await fetchUserByIdentifier(userId, adminClient);
      if (user && !foundUserIds.has(user.$id)) {
        users.push(user);
        foundUserIds.add(user.$id);
      }
    }

    // Cache the entire batch result
    const ttl = getTTLForRoute('users/get-by-ids');
    await cache.set(cacheKey, users, ttl);

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
