import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const adminClient = await createAdminClient();

    // Search users by fullName or email (case-insensitive partial match)
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [
        Query.or([
          Query.contains('fullName', query),
          Query.contains('email', query),
        ]),
        Query.limit(10), // Limit to 10 results
      ]
    );

    // Filter and sort results for better relevance
    const users = response.rows
      .map((user: any) => ({
        $id: user.$id,
        name: user.fullName, // Use fullName as the display name
        email: user.email,
        fullName: user.fullName,
      }))
      .filter((user) => {
        const searchLower = query.toLowerCase();
        const fullNameMatch = user.fullName
          ?.toLowerCase()
          .includes(searchLower);
        const emailMatch = user.email?.toLowerCase().includes(searchLower);

        return fullNameMatch || emailMatch;
      })
      .sort((a, b) => {
        // Sort by relevance: exact matches first, then partial matches
        const searchLower = query.toLowerCase();
        const aName = (a.fullName || '').toLowerCase();
        const bName = (b.fullName || '').toLowerCase();
        const aEmail = (a.email || '').toLowerCase();
        const bEmail = (b.email || '').toLowerCase();

        // Exact matches first
        if (aName === searchLower || aEmail === searchLower) return -1;
        if (bName === searchLower || bEmail === searchLower) return 1;

        // Starts with query
        if (aName.startsWith(searchLower) || aEmail.startsWith(searchLower))
          return -1;
        if (bName.startsWith(searchLower) || bEmail.startsWith(searchLower))
          return 1;

        return 0;
      });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json([], { status: 500 });
  }
}
