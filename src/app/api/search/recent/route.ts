import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Get recent searches for the user
    const recentSearches = await databases.listDocuments(
      appwriteConfig.databaseId,
      'search_history',
      [
        Query.equal('userId', userId),
        Query.orderDesc('timestamp'),
        Query.limit(limit)
      ]
    );

    // Extract unique queries from recent searches
    const uniqueQueries = new Map();
    recentSearches.documents.forEach(search => {
      if (!uniqueQueries.has(search.query)) {
        uniqueQueries.set(search.query, {
          query: search.query,
          timestamp: search.timestamp,
          resultCount: search.resultCount
        });
      }
    });

    return NextResponse.json({
      recentSearches: Array.from(uniqueQueries.values())
    });

  } catch (error) {
    console.error('Recent searches error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent searches' },
      { status: 500 }
    );
  }
}
