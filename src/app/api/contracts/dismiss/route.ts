import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { logAuditEvent } from '@/lib/services/audit-logger';
import { notificationService } from '@/lib/services/notificationService';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { constructFileUrl } from '@/lib/utils';
import CacheManager from '@/lib/services/cache-manager';

interface DismissContractRequest {
  userId: string;
  contractId: string;
  contractName: string;
  signatureData: string; // Base64 data URL
  signatureDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DismissContractRequest = await request.json();

    // Validate required fields
    if (
      !body.userId ||
      !body.contractId ||
      !body.contractName ||
      !body.signatureData ||
      !body.signatureDate
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: userId, contractId, contractName, signatureData, signatureDate',
        },
        { status: 400 }
      );
    }

    // Get user information for audit logging
    let userName = 'Unknown User';
    let userEmail = 'unknown@example.com';
    let auditUserId = body.userId;
    let orgId: string | undefined;

    try {
      const user = await getUserByAccountId(body.userId);
      if (user) {
        userName = user.fullName || 'Unknown User';
        userEmail = user.email || 'unknown@example.com';
        auditUserId = user.$id || body.userId;
        // Dynamically import to avoid build issues
        const { getUserDefaultOrganization } = await import('@/lib/rbac/permissions');
        const defaultOrg = await getUserDefaultOrganization(user.$id);
        orgId = defaultOrg?.orgId;
      }
    } catch (userError) {
      console.warn('Could not fetch user details for audit:', userError);
    }

    // Get client IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const dismissedAt = new Date().toISOString();
    const eventId = `contract_dismissal_${body.contractId}_${Date.now()}`;

    // Upload signature as image file to Appwrite Storage
    let signatureFileId: string | null = null;
    let signatureFileUrl: string | null = null;
    try {
      if (body.signatureData && appwriteConfig.bucketId) {
        // Convert Base64 data URL to Buffer
        const base64Data = body.signatureData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create InputFile from buffer
        const inputFile = InputFile.fromBuffer(
          buffer,
          `signature_${body.contractId}_${Date.now()}.png`
        );

        // Upload to Appwrite Storage
        const { storage } = await createAdminClient();
        const bucketFile = await storage.createFile(
          appwriteConfig.bucketId,
          ID.unique(),
          inputFile
        );

        signatureFileId = bucketFile.$id;
        // Construct file URL using utility function
        signatureFileUrl = constructFileUrl(bucketFile.$id);
        
        console.log('Signature uploaded to storage:', {
          fileId: signatureFileId,
          fileName: bucketFile.name,
          fileUrl: signatureFileUrl,
        });
      }
    } catch (storageError) {
      console.error('Failed to upload signature to storage:', storageError);
      // Continue without file storage - will use data URL in notification
    }

    // Create notification type if it doesn't exist
    try {
      const existingType = await notificationService.getNotificationType('contract_dismissal');
      if (!existingType) {
        await notificationService.createNotificationType({
          type_key: 'contract_dismissal',
          label: 'Contract Dismissal',
          icon: 'file-x',
          color_classes: 'text-orange-600',
          bg_color_classes: 'bg-orange-50',
          priority: 'medium',
          enabled: true,
          description: 'Notifications when contracts are dismissed with electronic signature',
        });
        console.log('Created notification type: contract_dismissal');
      }
    } catch (typeError) {
      console.warn('Could not create notification type (may already exist):', typeError);
    }

    // Create notification first (signature stored here, no size limit)
    let notification;
    try {
      notification = await notificationService.createNotification({
        userId: body.userId,
        title: `Contract Dismissal - ${body.contractName}`,
        message: `Contract dismissed on ${new Date(
          body.signatureDate
        ).toLocaleDateString()} with signature confirmation`,
        type: 'contract_dismissal',
        priority: 'medium',
        metadata: {
          contractId: body.contractId,
          contractName: body.contractName,
          signatureDate: body.signatureDate,
          dismissedAt: dismissedAt,
          signatureFileId: signatureFileId, // Reference to stored image file
          signatureFileUrl: signatureFileUrl, // URL to access the signature image
          // Only include Base64 if file upload failed (as fallback)
          ...(signatureFileId ? {} : { signatureData: body.signatureData }),
        },
      });

      // Invalidate cache for the user's notifications
      await CacheManager.invalidateNotifications(body.userId);

      // Broadcast new notification via SSE
      const { broadcastToUser } = await import('../../notifications/sse/route');
      await broadcastToUser(body.userId, notification);

      console.log('Notification created successfully for contract dismissal');
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Return error if notification creation fails
      return NextResponse.json(
        {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : 'Failed to create notification',
        },
        { status: 500 }
      );
    }

    // Create audit log entry (without signature data to avoid size limit)
    // Signature can be retrieved from the notification metadata
    // Keep metadata minimal to stay under 1000 character limit
    try {
      // Truncate contract name if too long for event title
      const contractNameDisplay = body.contractName.length > 50 
        ? body.contractName.substring(0, 47) + '...' 
        : body.contractName;

      const auditMetadata: Record<string, any> = {
        contractId: body.contractId,
        notificationId: notification.$id, // Reference to notification
      };

      // Only add signatureFileId if it exists and metadata is still small
      if (signatureFileId) {
        const testMetadata = { ...auditMetadata, signatureFileId };
        const testString = JSON.stringify(testMetadata);
        if (testString.length <= 900) {
          auditMetadata.signatureFileId = signatureFileId;
          if (signatureFileUrl) {
            auditMetadata.signatureFileUrl = signatureFileUrl;
          }
        }
      }

      await logAuditEvent({
        event_id: eventId,
        event_title: `Contract Dismissed: ${contractNameDisplay}`,
        action: 'delete', // Using 'delete' as per Appwrite schema (allowed: delete, sync_delete, restore, cleanup)
        source: 'caalm',
        user_id: auditUserId,
        user_name: userName,
        user_email: userEmail,
        orgId: orgId,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason: 'Contract dismissed with electronic signature',
        status: 'success',
        metadata: auditMetadata,
      });
      console.log('Audit log entry created successfully for contract dismissal:', {
        eventId,
        contractId: body.contractId,
        hasSignatureFile: !!signatureFileId,
      });
    } catch (auditError) {
      console.error('Failed to create audit log entry:', auditError);
      // Log detailed error for debugging
      if (auditError instanceof Error) {
        console.error('Audit log error details:', {
          message: auditError.message,
          stack: auditError.stack,
        });
      }
      // Continue even if audit logging fails - notification was already created
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Contract dismissed successfully',
        data: {
          auditLogId: eventId,
          notificationId: notification.$id,
          dismissedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to dismiss contract:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to dismiss contract',
      },
      { status: 500 }
    );
  }
}
