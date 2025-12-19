import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { SmsFormSubmission } from '@/lib/database/schemas/sms-form-submissions.schema';
import { logAuditEvent } from '@/lib/services/audit-logger';

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

/**
 * DELETE /api/sms-form-submission?userId=xxx
 * Disable SMS notifications for a user
 * - Sets verified to false in SMS Form Submissions
 * - Creates audit log entry with submission data
 * - Deletes the SMS Form Submission row
 */
export async function DELETE(request: NextRequest) {
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

    const collectionId =
      appwriteConfig.smsFormSubmissionsCollectionId || '6944624900234b99ff40';

    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database ID is not configured' },
        { status: 500 }
      );
    }

    // Find the SMS form submission
    const submissions = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      queries: [
        Query.equal('user_id', userId),
        Query.orderDesc('submitted_at'),
        Query.limit(1),
      ],
    });

    let submission = submissions.total > 0 ? submissions.rows[0] : null;

    if (!submission) {
      // Try account_id
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

    // If no submission found, SMS notifications are already disabled
    // Return success since the goal (disabled state) is already achieved
    if (!submission) {
      return NextResponse.json({
        success: true,
        message: 'SMS notifications are already disabled',
        alreadyDisabled: true,
      });
    }

    const submissionData = submission as unknown as SmsFormSubmission;

    // Set verified to false
    await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      rowId: submissionData.$id,
      data: {
        verified: false,
      },
    });

    // Create audit log entry BEFORE deleting the submission
    console.log('Creating audit log entry for SMS disable:', {
      userId,
      submissionData: {
        first_name: submissionData.first_name,
        last_name: submissionData.last_name,
        email: submissionData.email,
        phone_number: submissionData.phone_number,
      },
    });

    let auditLogCreated = false;
    let auditErrorDetails: any = null;

    // Try using logAuditEvent first (standard method)
    // Note: Audit log collection only accepts: delete, sync_delete, restore, cleanup
    try {
      await logAuditEvent({
        event_id: ID.unique(),
        event_title: 'SMS Notifications Disabled',
        action: 'delete', // Using 'delete' as it's the closest match for disabling/removing SMS notifications
        source: 'caalm',
        user_id: userId,
        user_name: `${submissionData.first_name} ${submissionData.last_name}`,
        user_email: submissionData.email,
        orgId: 'default_organization',
        status: 'success',
        metadata: {
          phone_number: submissionData.phone_number,
          submitted_at: submissionData.submitted_at,
          original_verified: true,
          new_verified: false,
        },
      });
      auditLogCreated = true;
      console.log('Audit log entry created successfully via logAuditEvent');
    } catch (logError: any) {
      console.warn(
        'logAuditEvent failed, trying direct method:',
        logError?.message
      );
      auditErrorDetails = logError;

      // Fallback: Try direct creation
      const auditLogsCollectionId =
        appwriteConfig.auditLogsCollectionId || '6912d0f00001ab23456c';

      if (!appwriteConfig.databaseId) {
        console.error('Database ID is not configured for audit log fallback');
      } else {
        try {
          const auditData = {
            event_id: ID.unique(),
            event_title: 'SMS Notifications Disabled',
            action: 'delete', // Using 'delete' as it's the closest match for disabling/removing SMS notifications
            source: 'caalm',
            user_id: userId,
            user_name: `${submissionData.first_name} ${submissionData.last_name}`,
            user_email: submissionData.email,
            orgId: 'default_organization',
            status: 'success',
            ip_address: null,
            user_agent: null,
            reason: null,
            error_message: null,
            metadata: JSON.stringify({
              phone_number: submissionData.phone_number,
              submitted_at: submissionData.submitted_at,
              original_verified: true,
              new_verified: false,
            }),
          };

          const auditResult = await tablesDB.createRow({
            databaseId: appwriteConfig.databaseId,
            tableId: auditLogsCollectionId,
            rowId: ID.unique(),
            data: auditData,
          });

          auditLogCreated = true;
          console.log(
            'Audit log entry created successfully via direct method:',
            {
              auditLogId: auditResult.$id,
              event_id: auditData.event_id,
            }
          );
        } catch (directError: any) {
          auditErrorDetails = directError;
          console.error('Both audit log methods failed:', {
            logAuditEventError: logError?.message,
            directMethodError: directError?.message,
            code: directError?.code,
            type: directError?.type,
            response: directError?.response,
            auditLogsCollectionId,
            databaseId: appwriteConfig.databaseId,
          });
        }
      }
    }

    // Log warning if audit log creation failed
    if (!auditLogCreated) {
      console.error(
        'CRITICAL: Audit log entry was not created for SMS disable operation.',
        'User ID:',
        userId,
        'Error:',
        auditErrorDetails?.message || 'Unknown error'
      );
    }

    // Delete the SMS form submission AFTER attempting audit log creation
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      rowId: submissionData.$id,
    });

    // Return success with warning if audit log failed
    return NextResponse.json({
      success: true,
      message: 'SMS notifications disabled successfully',
      auditLogCreated,
      ...(auditErrorDetails && {
        warning:
          'SMS notifications disabled but audit log entry was not created',
        auditError: auditErrorDetails.message,
      }),
    });
  } catch (error: any) {
    console.error('Failed to disable SMS notifications:', error);
    return NextResponse.json(
      {
        error: 'Failed to disable SMS notifications',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
