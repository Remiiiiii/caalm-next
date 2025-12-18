import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { SmsFormSubmission } from '@/lib/database/schemas/sms-form-submissions.schema';

/**
 * POST /api/sms-form-submission
 * Submit SMS notification opt-in form
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accountId, firstName, lastName, email, phoneNumber } = body;

    // Validate required fields
    if (!userId || !firstName || !lastName || !email || !phoneNumber) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: userId, firstName, lastName, email, phoneNumber',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Use the collection ID from config or fallback to the one we created
    const collectionId =
      appwriteConfig.smsFormSubmissionsCollectionId || '6944624900234b99ff40';

    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database ID is not configured' },
        { status: 500 }
      );
    }

    // Check if user already has a submission
    const existingSubmissions = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      queries: [
        Query.equal('user_id', userId),
        Query.orderDesc('submitted_at'),
        Query.limit(1),
      ],
    });

    // If submission exists, update it; otherwise create new
    const submissionData: Partial<SmsFormSubmission> = {
      user_id: userId,
      account_id: accountId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone_number: phoneNumber.trim(),
      submitted_at: new Date().toISOString(),
      verified: true, // Self-submitted forms are verified by default
    };

    let submission: SmsFormSubmission;

    if (existingSubmissions.total > 0) {
      // Update existing submission
      submission = (await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: collectionId,
        rowId: existingSubmissions.rows[0].$id,
        data: submissionData,
      })) as unknown as SmsFormSubmission;
    } else {
      // Create new submission
      submission = (await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: collectionId,
        rowId: ID.unique(),
        data: submissionData,
      })) as unknown as SmsFormSubmission;
    }

    return NextResponse.json({
      success: true,
      data: submission,
    });
  } catch (error: any) {
    console.error('Failed to submit SMS form:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to submit SMS form',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sms-form-submission?userId=xxx
 * Check if user has submitted the SMS form
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Use the collection ID from config or fallback to the one we created
    const collectionId =
      appwriteConfig.smsFormSubmissionsCollectionId || '6944624900234b99ff40';

    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database ID is not configured' },
        { status: 500 }
      );
    }

    // Check for submission by user_id
    const submissions = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      queries: [
        Query.equal('user_id', userId),
        Query.orderDesc('submitted_at'),
        Query.limit(1),
      ],
    });

    // If no submission found by user_id, try account_id
    let submission = submissions.total > 0 ? submissions.rows[0] : null;

    if (!submission) {
      const accountSubmissions = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: collectionId,
        queries: [
          Query.equal('account_id', userId),
          Query.orderDesc('submitted_at'),
          Query.limit(1),
        ],
      });

      submission =
        accountSubmissions.total > 0 ? accountSubmissions.rows[0] : null;
    }

    if (!submission) {
      return NextResponse.json({
        submitted: false,
        data: null,
      });
    }

    return NextResponse.json({
      submitted: true,
      verified: submission.verified ?? true,
      data: submission,
    });
  } catch (error: any) {
    console.error('Failed to check SMS form submission:', error);
    return NextResponse.json(
      {
        error: 'Failed to check SMS form submission',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
