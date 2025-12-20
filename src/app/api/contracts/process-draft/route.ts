import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { Storage } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { DraftService } from '@/lib/api/contracts/services/DraftService';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    // Validate request body
    const body = await parseAndValidateBody(request, processDraftSchema);
    const { draftId } = body;

    const { tablesDB, storage } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId ||
      !appwriteConfig.bucketId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Get the draft
    const draft = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });

    if (!draft) {
      return notFoundResponse('Draft', requestId);
    }

    const ownerId = draft.ownerId as string;
    const accountId = draft.accountId as string;

    // Verify owner access
    const ownerError = await requireAuthAndOwner(request, ownerId);
    if (ownerError) return ownerError;
    const formData = draft.formData
      ? JSON.parse(draft.formData as string)
      : null;
    const processedFileData = draft.processedFileData
      ? JSON.parse(draft.processedFileData as string)
      : null;

    if (!processedFileData || !processedFileData.name) {
      return validationErrorResponse(
        'Draft does not contain file data',
        requestId
      );
    }

    const result: any = {
      draftId,
      steps: [] as string[],
      fileRow: null,
      contractRow: null,
    };

    // Step 1: Get file from storage or upload if needed
    result.steps.push('Step 1: Getting file from storage...');
    let bucketFile;
    try {
      // If bucketFileId exists, fetch the file from storage
      if (processedFileData.bucketFileId) {
        try {
          bucketFile = await FileService.getFileFromStorage(
            processedFileData.bucketFileId
          );
          result.steps.push(`✓ File retrieved from storage: ${bucketFile.$id}`);
        } catch (fetchError: any) {
          // File might have been deleted, need to re-upload
          result.steps.push(`⚠ File not found in storage, will need re-upload`);
          throw new Error(
            'File not found in storage. Please re-upload the file.'
          );
        }
      } else {
        // Fallback: try to use arrayBuffer if it exists (for old drafts)
        const arrayBuffer = processedFileData.arrayBuffer
          ? Buffer.from(processedFileData.arrayBuffer)
          : null;

        if (!arrayBuffer) {
          throw new Error(
            'File data not available. Please re-upload the file when resuming the draft.'
          );
        }

        const bucketFileId = await FileService.uploadFileToStorage(
          arrayBuffer,
          processedFileData.name
        );
        bucketFile = await FileService.getFileFromStorage(bucketFileId);
        result.steps.push(`✓ File uploaded to storage: ${bucketFile.$id}`);
      }
    } catch (error: any) {
      result.steps.push(`✗ Failed to get/upload file: ${error.message}`);
      return NextResponse.json(
        {
          success: false,
          result,
          error: 'Failed to get file from storage',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Step 2: Get user's organization
    result.steps.push('Step 2: Getting user organization...');
    const defaultOrg = await getUserDefaultOrganization(ownerId);
    if (!defaultOrg) {
      return NextResponse.json(
        {
          success: false,
          result,
          error: 'Could not determine user organization',
        },
        { status: 500 }
      );
    }
    result.steps.push(`✓ Organization: ${defaultOrg.orgId}`);

    // Step 3: Create file row in Files collection
    result.steps.push('Step 3: Creating file row in Files collection...');
    const fileType = getFileType(processedFileData.name);

    const fileDocument: any = {
      name: processedFileData.name,
      type: fileType.type,
      extension: fileType.extension,
      size: processedFileData.size || bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      orgId: defaultOrg.orgId,
      url: constructFileUrl(bucketFile.$id),
      bucketFileId: bucketFile.$id,
      isContract: true,
    };

    // Add contract metadata from formData if available
    if (formData?.contractName) {
      fileDocument.contractName = formData.contractName;
    }

    try {
      const fileRow = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId!,
        tableId: appwriteConfig.filesCollectionId!,
        rowId: ID.unique(),
        data: fileDocument,
      });

      result.fileRow = { $id: fileRow.$id };
      result.steps.push(`✓ File row created: ${fileRow.$id}`);
    } catch (error: any) {
      result.steps.push(`✗ Failed to create file row: ${error.message}`);
      // Try to clean up storage file
      try {
        await storage.deleteFile({
          bucketId: appwriteConfig.bucketId!,
          fileId: bucketFile.$id,
        });
      } catch {}
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to create file row'),
        500,
        { requestId }
      );
    }

    // Step 4: Create contract row in Contracts collection
    result.steps.push(
      'Step 4: Creating contract row in Contracts collection...'
    );

    if (!formData) {
      result.steps.push('⚠ No form data available, skipping contract creation');
      return successResponse(result, {
        requestId,
        message: 'File created but contract not created (no form data)',
      });
    }

    try {
      // Use ContractService to create contract
      const contract = await ContractService.createContract(
        ownerId,
        result.fileRow.$id,
        formData
      );

      result.contractRow = { $id: contract.$id };
      result.steps.push(`✓ Contract row created: ${contract.$id}`);

      // Update file row with contract metadata
      await ContractService.updateFileWithContractMetadata(
        result.fileRow.$id,
        contract
      );

      result.steps.push(`✓ File row updated with contract metadata`);
    } catch (error: any) {
      result.steps.push(`✗ Failed to create contract row: ${error.message}`);
      return errorResponse(
        error instanceof Error
          ? error
          : new Error('Failed to create contract row'),
        500,
        {
          requestId,
          details: {
            message: error.message,
            code: error.code,
            type: error.type,
          },
        }
      );
    }

    // Step 5: Mark draft as completed
    result.steps.push('Step 5: Marking draft as completed...');
    try {
      await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractDraftsCollectionId,
        rowId: draftId,
        data: {
          isCompleted: true,
        },
      });
      result.steps.push('✓ Draft marked as completed');
    } catch (error: any) {
      result.steps.push(
        `⚠ Failed to mark draft as completed: ${error.message}`
      );
    }

    return successResponse(result, {
      requestId,
      message: 'Draft processed successfully',
    });
  } catch (error: any) {
    console.error('Error processing draft:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to process draft'),
      500,
      { requestId }
    );
  }
}
