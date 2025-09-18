import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { parseStringify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 10;

    const { tablesDB } = await createAdminClient();

    // Fetch all recent files (not filtered by owner for dashboard)
    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries: [
        Query.limit(limit),
        Query.orderDesc('$createdAt'), // Most recent first
      ],
    });

    return NextResponse.json({ data: parseStringify(files).rows || [] });
  } catch (error) {
    console.error('Failed to fetch dashboard files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard files' },
      { status: 500 }
    );
  }
}
