import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { getFileType } from '@/lib/utils';

const FILES_COLLECTION_ID = '6934a3120033b4a5c4da';
const CONTRACTS_COLLECTION_ID = '6912e5a400789ef12345'; // User provided ID

// Map form contract types to database enum values
const mapContractTypeToEnum = (contractType: string | undefined): string => {
  if (!contractType) return 'Other';
  
  const typeMap: Record<string, string> = {
    'Service Agreement': 'Service_Agreement',
    'Professional Services': 'Consulting_Agreement',
    'Purchase Agreement': 'Purchase_Order',
    'Lease Agreement': 'Lease_Agreement',
    'License Agreement': 'License_Agreement',
    'Employment Contract': 'Employment_Contract',
    'Confidentiality/NDA': 'NDA_',
    'Vendor Contract': 'Vendor_Contract',
    'Master Agreement': 'Service_Agreement', // Default to Service_Agreement
    'Statement of Work (SOW)': 'Consulting_Agreement', // Default to Consulting_Agreement
    'Amendment': 'Other',
    'Other': 'Other',
  };
  
  return typeMap[contractType] || 'Other';
};

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
  try {
    const { draftId, ownerId } = await request.json();

    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.contractDraftsCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
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
          const existingFiles = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId!,
            tableId: FILES_COLLECTION_ID,
            queries: [
              Query.equal('owner', ownerId),
              Query.equal('name', processedFileData.name),
              Query.limit(1),
            ],
          });

          let fileRow;
          if (existingFiles.total > 0) {
            fileRow = existingFiles.rows[0];
            result.steps.push(`✓ File already exists: ${fileRow.$id}`);
          } else {
            // Create file row
            result.steps.push(`Creating file row in Files collection...`);
            const defaultOrg = await getUserDefaultOrganization(ownerId);
            if (!defaultOrg) {
              throw new Error(`Could not get default organization for user ${ownerId}`);
            }

            const fileType = getFileType(processedFileData.name);
            const fileDocument: any = {
              name: processedFileData.name,
              type: fileType.type,
              extension: fileType.extension,
              size: processedFileData.size || 0,
              owner: ownerId,
              accountId,
              users: [],
              orgId: defaultOrg.orgId,
              url: '', // Placeholder - will be updated when file is uploaded
              bucketFileId: '', // Placeholder - will be updated when file is uploaded
              isContract: true,
            };

            if (formData?.contractName) {
              fileDocument.contractName = formData.contractName;
            }

            fileRow = await tablesDB.createRow({
              databaseId: appwriteConfig.databaseId!,
              tableId: FILES_COLLECTION_ID,
              rowId: ID.unique(),
              data: fileDocument,
            });

            result.steps.push(`✓ Created file row: ${fileRow.$id}`);
            result.created.files.push(fileRow.$id);
          }

          // Step 2: Check/create contract in Contracts collection (if draft is completed or has enough data)
          if (draft.isCompleted || (draft.currentStep >= 2 && formData)) {
            result.steps.push(`Checking for contract in Contracts collection...`);
            
            // Check if contract already exists for this file
            const existingContracts = await tablesDB.listRows({
              databaseId: appwriteConfig.databaseId!,
              tableId: CONTRACTS_COLLECTION_ID,
              queries: [
                Query.equal('fileId', fileRow.$id),
                Query.limit(1),
              ],
            });

            if (existingContracts.total > 0) {
              result.steps.push(`✓ Contract already exists: ${existingContracts.rows[0].$id}`);
            } else {
              // Create contract row
              result.steps.push(`Creating contract row in Contracts collection...`);
              
              const defaultOrg = await getUserDefaultOrganization(ownerId);
              if (!defaultOrg) {
                throw new Error(`Could not get default organization for user ${ownerId}`);
              }

              // Build contract document from formData
              const contractDocument: any = {
                contractName: formData?.contractName || processedFileData.name,
                fileId: fileRow.$id,
                fileRef: fileRow.$id,
                orgId: defaultOrg.orgId,
                status: 'pending-review',
                // Required field - use formData value or default to 1 year from now
                contractExpiryDate: formData?.contractExpiryDate || (() => {
                  const oneYearFromNow = new Date();
                  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                  return oneYearFromNow.toISOString().split('T')[0];
                })(),
                // Required field - use formData value mapped to enum or default
                contractType: mapContractTypeToEnum(formData?.contractType),
              };

              // Add required fields with defaults if not in formData (mapped to enum)
              contractDocument.department = mapDepartmentToEnum(
                formData?.department || formData?.assignToDepartment
              );
              
              // Add optional fields from formData
              if (formData) {
                if (formData.contractExpiryDate) contractDocument.contractExpiryDate = formData.contractExpiryDate;
                if (formData.contractType) contractDocument.contractType = formData.contractType;
                // Parse amount as float if present
                if (formData.amount) {
                  const parsedAmount = typeof formData.amount === 'string' 
                    ? parseFloat(formData.amount.replace(/[^0-9.-]/g, '')) 
                    : Number(formData.amount);
                  if (!isNaN(parsedAmount)) {
                    contractDocument.amount = parsedAmount;
                  }
                }
                if (formData.vendor) contractDocument.vendor = formData.vendor;
                if (formData.contractNumber) contractDocument.contractNumber = formData.contractNumber;
                if (formData.priority) contractDocument.priority = formData.priority;
                if (formData.compliance) contractDocument.compliance = formData.compliance;
                if (formData.assignedManagers && Array.isArray(formData.assignedManagers)) {
                  contractDocument.assignedManagers = formData.assignedManagers;
                }
                if (formData.startDate) contractDocument.startDate = formData.startDate;
                if (formData.executionDate) contractDocument.executionDate = formData.executionDate;
                if (formData.autoRenew !== undefined) contractDocument.autoRenew = formData.autoRenew;
                // Parse renewalNoticeDays as integer if present
                if (formData.renewalNoticeDays) {
                  const parsedDays = typeof formData.renewalNoticeDays === 'string'
                    ? parseInt(formData.renewalNoticeDays, 10)
                    : Number(formData.renewalNoticeDays);
                  if (!isNaN(parsedDays)) {
                    contractDocument.renewalNoticeDays = parsedDays;
                  }
                }
              }

              // Calculate days until expiry if expiry date exists
              if (contractDocument.contractExpiryDate) {
                try {
                  const expiryDate = new Date(contractDocument.contractExpiryDate);
                  const today = new Date();
                  const timeDiff = expiryDate.getTime() - today.getTime();
                  contractDocument.daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
                } catch (error) {
                  console.error('Error calculating days until expiry:', error);
                }
              }

              const contract = await tablesDB.createRow({
                databaseId: appwriteConfig.databaseId!,
                tableId: CONTRACTS_COLLECTION_ID,
                rowId: ID.unique(),
                data: contractDocument,
              });

              result.steps.push(`✓ Created contract row: ${contract.$id}`);
              result.created.contracts.push(contract.$id);
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

      return NextResponse.json({
        success: result.success,
        result,
      });
    } catch (error: any) {
      console.error('Backfill error:', error);
      return NextResponse.json(
        {
          error: 'Failed to backfill drafts',
          message: error?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Backfill drafts error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

