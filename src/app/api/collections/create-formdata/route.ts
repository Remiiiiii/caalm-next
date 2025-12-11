import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Databases } from 'node-appwrite';

const CONTRACT_DRAFTS_COLLECTION_ID = '692f4a86002ae8f45cae';

export async function POST(request: NextRequest) {
  try {
    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { databases } = await createAdminClient();

    // Create formData attribute with smaller size (16KB instead of 64KB)
    try {
      await databases.createStringAttribute(
        appwriteConfig.databaseId,
        CONTRACT_DRAFTS_COLLECTION_ID,
        'formData',
        16384, // 16KB
        true, // required
        undefined, // no default for required attributes
        false // not array
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully created formData attribute (16KB)',
      });
    } catch (error: any) {
      // If attribute already exists, that's okay
      if (error.code === 409 || error.message?.includes('already exists')) {
        return NextResponse.json({
          success: true,
          message: 'formData attribute already exists',
          warning: error.message,
        });
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error creating formData attribute:', error);
    return NextResponse.json(
      {
        error: 'Failed to create formData attribute',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}






