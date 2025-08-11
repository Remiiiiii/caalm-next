import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET() {
  try {
    const client = await createAdminClient();

    // Test if we can access the OTP tokens collection
    const collections = await client.databases.listCollections(
      appwriteConfig.databaseId
    );

    const otpCollection = collections.collections.find(
      (col) => col.$id === appwriteConfig.otpTokensCollectionId
    );

    if (!otpCollection) {
      return NextResponse.json(
        {
          success: false,
          error: 'OTP tokens collection not found',
          availableCollections: collections.collections.map((col) => ({
            id: col.$id,
            name: col.name,
          })),
          expectedCollectionId: appwriteConfig.otpTokensCollectionId,
        },
        { status: 404 }
      );
    }

    // Try to list documents to verify access
    const documents = await client.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.otpTokensCollectionId,
      []
    );

    return NextResponse.json({
      success: true,
      collection: {
        id: otpCollection.$id,
        name: otpCollection.name,
        documentCount: documents.documents.length,
      },
      message: 'OTP tokens collection is accessible',
    });
  } catch (error) {
    console.error('Error testing OTP collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to access OTP tokens collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
