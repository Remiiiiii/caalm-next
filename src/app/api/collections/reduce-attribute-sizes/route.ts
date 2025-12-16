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

    const result: any = {
      steps: [] as string[],
      updated: [] as string[],
      errors: [] as string[],
    };

    // Reduce processedFileData size from 1,000,000 to 10,000 (10KB should be enough for metadata)
    try {
      result.steps.push('Reducing processedFileData attribute size...');
      // Note: Appwrite doesn't allow direct attribute size updates
      // We need to delete and recreate, but that's risky
      // Instead, let's optimize the data first, then we can try to reduce size
      result.steps.push('⚠ Cannot directly reduce attribute size in Appwrite');
      result.steps.push('⚠ Need to optimize existing data first');
    } catch (error: any) {
      result.errors.push(`Error reducing processedFileData size: ${error.message}`);
    }

    // Reduce formData size from 65,535 to 32,767 (32KB should be enough)
    try {
      result.steps.push('Reducing formData attribute size...');
      // Same issue - cannot directly update attribute size
      result.steps.push('⚠ Cannot directly reduce attribute size in Appwrite');
    } catch (error: any) {
      result.errors.push(`Error reducing formData size: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Attribute size reduction attempted',
      result,
      note: 'Appwrite does not allow direct attribute size updates. You must delete and recreate attributes, or optimize existing data to reduce actual usage.',
    });
  } catch (error: any) {
    console.error('Error reducing attribute sizes:', error);
    return NextResponse.json(
      {
        error: 'Failed to reduce attribute sizes',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}











