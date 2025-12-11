import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');

    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Get the collection to see all attributes
    // Try getCollection first, fallback to listColumns if needed
    let collection;
    try {
      collection = await tablesDB.getCollection({
        databaseId: appwriteConfig.databaseId,
        tableId: collectionId,
      });
    } catch (error: any) {
      // Fallback: try to get attributes via listColumns
      try {
        const columns = await tablesDB.listColumns({
          databaseId: appwriteConfig.databaseId,
          tableId: collectionId,
        });
        return NextResponse.json({
          success: true,
          collectionId,
          totalAttributes: columns.total || 0,
          attributes: columns.columns || [],
        });
      } catch (listError: any) {
        throw error; // Throw original error
      }
    }

    return NextResponse.json({
      success: true,
      collectionId,
      totalAttributes: collection.attributes?.length || 0,
      attributes: collection.attributes || [],
    });
  } catch (error: any) {
    console.error('Error listing attributes:', error);
    return NextResponse.json(
      {
        error: 'Failed to list attributes',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
