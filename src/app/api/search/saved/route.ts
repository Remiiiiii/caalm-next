import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Get saved searches for the user
    const savedSearches = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'saved_searches',
      queries: [Query.equal('userId', userId), Query.orderDesc('$createdAt')],
    });

    return NextResponse.json({
      savedSearches: savedSearches.rows,
    });
  } catch (error) {
    console.error('Saved searches error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, query, filters } = body;

    if (!userId || !name || !query) {
      return NextResponse.json(
        { error: 'User ID, name, and query are required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Check if a saved search with the same name already exists
    const existingSearches = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'saved_searches',
      queries: [Query.equal('userId', userId), Query.equal('name', name)],
    });

    if (existingSearches.rows.length > 0) {
      return NextResponse.json(
        { error: 'A saved search with this name already exists' },
        { status: 409 }
      );
    }

    // Create new saved search
    const savedSearch = await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: 'saved_searches',
      rowId: ID.unique(),
      data: {
        userId,
        name,
        query,
        filters: filters || {},
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ savedSearch });
  } catch (error) {
    console.error('Save search error:', error);
    return NextResponse.json(
      { error: 'Failed to save search' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');
    const userId = searchParams.get('userId');

    if (!searchId || !userId) {
      return NextResponse.json(
        { error: 'Search ID and User ID are required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Verify the search belongs to the user
    const search = await databases.getDocument(
      appwriteConfig.databaseId,
      'saved_searches',
      searchId
    );

    if (search.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the saved search
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      'saved_searches',
      searchId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete saved search error:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}
