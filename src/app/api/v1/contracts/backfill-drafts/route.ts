import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';


// Map department values to database enum values
const mapDepartmentToEnum = (department: string | undefined): string => {
  if (!department) return 'Administration';
  
  // Valid enum values: IT, Finance, Legal, Operations, Sales, Marketing, Executive, Engineering, Administration
  const deptMap: Record<string, string> = {
    'IT': 'IT',
    'Finance': 'Finance',
    'Legal': 'Legal',
    'Operations': 'Operations',
    'Sales': 'Sales',
    'Marketing': 'Marketing',
    'Executive': 'Executive',
    'Engineering': 'Engineering',
    'Administration': 'Administration',
    'General': 'Administration', // Default mapping
  };
  
  // Try exact match first
  if (deptMap[department]) return deptMap[department];
  
  // Try case-insensitive match
  const lowerDept = department.toLowerCase();
  for (const [key, value] of Object.entries(deptMap)) {
    if (key.toLowerCase() === lowerDept) return value;
  }
  
  // Default fallback
  return 'Administration';
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  // Authentication - this is an admin operation
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { draftId, ownerId } = await request.json();

    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.contractDraftsCollectionId) {
      return errorResponse(
        new Error('Database configuration missing'),
        500,
        { requestId }
      );
    }

    const result: any = {
      timestamp: new Date().toISOString(),
      steps: [] as string[],
      created: {
        files: [] as string[],
        contracts: [] as string[],
      },
      errors: [] as string[],
    };

    try {
      // Get the draft(s) to process
      let drafts: any[] = [];

      if (draftId) {
        // Process specific draft
        result.steps.push(`Fetching draft ${draftId}...`);
        const draft = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draftId,
        });
        drafts = [draft];
      } else if (ownerId) {
        // Process all drafts for owner
        result.steps.push(`Fetching drafts for owner ${ownerId}...`);
        const draftsResponse = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          queries: [
            Query.equal('ownerId', ownerId),
            Query.greaterThanEqual('currentStep', 2), // Only drafts at step 2 or higher
            Query.limit(100),
          ],
        });
        drafts = draftsResponse.rows;
        result.steps.push(`Found ${drafts.length} draft(s) to process`);
      } else {
        // Process all drafts at step 2 or higher
        result.steps.push('Fetching all drafts at step 2 or higher...');
        const draftsResponse = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          queries: [
            Query.greaterThanEqual('currentStep', 2),
            Query.limit(100),
          ],
        });
        drafts = draftsResponse.rows;
        result.steps.push(`Found ${drafts.length} draft(s) to process`);
      }

      for (const draft of drafts) {
        try {
          result.steps.push(`\nProcessing draft ${draft.$id}...`);

          // Parse draft data
          const formData = draft.formData ? JSON.parse(draft.formData) : null;
          const processedFileData = draft.processedFileData
            ? JSON.parse(draft.processedFileData)
            : null;

          if (!processedFileData || !processedFileData.name) {
            result.steps.push(`⚠ Draft ${draft.$id} has no processedFileData, skipping`);
            continue;
          }

          const ownerId = draft.ownerId;
          const accountId = draft.accountId;

          // Step 1: Check/create file in Files collection
          result.steps.push(`Checking for file in Files collection...`);
          let fileRow: any = null;
          try {
            fileRow = await FileService.createOrUpdateFileRow(ownerId, accountId, {
              name: processedFileData.name,
              size: processedFileData.size || 0,
              bucketFileId: processedFileData.bucketFileId || null,
              contractName: formData?.contractName,
            });
            if (fileRow) {
              result.steps.push(`✓ File row ready: ${fileRow.$id}`);
              result.created.files.push(fileRow.$id);
            }
          } catch (fileError: any) {
            result.steps.push(`⚠ Error with file row: ${fileError.message}`);
          }

          // Step 2: Check/create contract in Contracts collection (if draft is completed or has enough data)
          if (draft.isCompleted || (draft.currentStep >= 2 && formData)) {
            result.steps.push(`Checking for contract in Contracts collection...`);
            
            // Check if contract already exists for this file
            const existingContracts = await tablesDB.listRows({
              databaseId: appwriteConfig.databaseId!,
              tableId: appwriteConfig.contractsCollectionId!,
              queries: [
                Query.equal('fileId', fileRow.$id),
                Query.limit(1),
              ],
            });

            if (existingContracts.total > 0) {
              result.steps.push(`✓ Contract already exists: ${existingContracts.rows[0].$id}`);
            } else {
              // Create contract row using ContractService
              result.steps.push(`Creating contract row in Contracts collection...`);
              
              // Prepare formData with defaults
              const contractFormData = {
                ...formData,
                contractName: formData?.contractName || processedFileData.name,
                contractExpiryDate: formData?.contractExpiryDate || (() => {
                  const oneYearFromNow = new Date();
                  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                  return oneYearFromNow.toISOString().split('T')[0];
                })(),
                department: mapDepartmentToEnum(
                  formData?.department || formData?.assignToDepartment
                ),
              };

              const contract = await ContractService.createContract(
                ownerId,
                fileRow.$id,
                contractFormData
              );

              result.steps.push(`✓ Created contract row: ${contract.$id}`);
              result.created.contracts.push(contract.$id);

              // Update file row with contract metadata
              await ContractService.updateFileWithContractMetadata(
                fileRow.$id,
                contract
              );
            }
          } else {
            result.steps.push(`⚠ Draft not completed yet, skipping contract creation`);
          }
        } catch (draftError: any) {
          const errorMsg = `Error processing draft ${draft.$id}: ${draftError.message}`;
          result.steps.push(`✗ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      result.summary = {
        totalDrafts: drafts.length,
        filesCreated: result.created.files.length,
        contractsCreated: result.created.contracts.length,
        errors: result.errors.length,
      };

      return successResponse(result, { requestId });
    } catch (error: any) {
      console.error('Backfill error:', error);
      return errorResponse(
        error instanceof Error
          ? error
          : new Error('Failed to backfill drafts'),
        500,
        { requestId }
      );
    }
  } catch (error: any) {
    console.error('Backfill drafts error:', error);
    return errorResponse(
      error instanceof Error
        ? error
        : new Error('Failed to process request'),
      500,
      { requestId }
    );
  }
}

