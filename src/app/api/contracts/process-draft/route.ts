import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { Storage } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { getFileType, constructFileUrl } from '@/lib/utils';
import { getUserById } from '@/lib/actions/user.actions';

const sanitizePayload = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    })
  );

const mapRiskToPriority = (risk?: string) => {
  if (!risk) return 'Medium';
  switch (risk) {
    case 'critical':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    default:
      return 'Medium';
  }
};

const mapRiskToCompliance = (risk?: string) => {
  if (!risk) return 'action-required';
  switch (risk) {
    case 'critical':
      return 'non-compliant';
    case 'high':
      return 'action-required';
    case 'low':
      return 'up-to-date';
    default:
      return 'action-required';
  }
};

export async function POST(request: NextRequest) {
  try {
    const { draftId } = await request.json();

    if (!draftId) {
      return NextResponse.json(
        { error: 'draftId is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const ownerId = draft.ownerId as string;
    const accountId = draft.accountId as string;
    const formData = draft.formData
      ? JSON.parse(draft.formData as string)
      : null;
    const processedFileData = draft.processedFileData
      ? JSON.parse(draft.processedFileData as string)
      : null;

    if (!processedFileData || !processedFileData.name) {
      return NextResponse.json(
        { error: 'Draft does not contain file data' },
        { status: 400 }
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
          bucketFile = await storage.getFile({
            bucketId: appwriteConfig.bucketId!,
            fileId: processedFileData.bucketFileId,
          });
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

        const inputFile = InputFile.fromBuffer(
          arrayBuffer,
          processedFileData.name
        );

        bucketFile = await storage.createFile({
          bucketId: appwriteConfig.bucketId!,
          fileId: ID.unique(),
          file: inputFile,
        });

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
    const filesCollectionId = '6934a3120033b4a5c4da';
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
        tableId: filesCollectionId,
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
      return NextResponse.json(
        {
          success: false,
          result,
          error: 'Failed to create file row',
        },
        { status: 500 }
      );
    }

    // Step 4: Create contract row in Contracts collection
    result.steps.push(
      'Step 4: Creating contract row in Contracts collection...'
    );
    const contractsCollectionId = '6912e5a400789ef12345';

    if (!formData) {
      result.steps.push('⚠ No form data available, skipping contract creation');
      return NextResponse.json({
        success: true,
        result,
        message: 'File created but contract not created (no form data)',
      });
    }

    try {
      // Prepare contract metadata similar to uploadFile function
      const contractExpiryDate = formData.expiryDate
        ? new Date(formData.expiryDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // All contracts default to 'pending-review' and require review before activation
      const status =
        formData.lifecycleStatus === 'terminated'
          ? 'action-required'
          : 'pending-review';

      // Get assigned managers names
      const assignedManagers = await (async () => {
        const managerIds = formData.assignedManagers || [];
        if (managerIds.length === 0) return [];

        const managerNames: string[] = [];
        for (const managerId of managerIds) {
          try {
            const user = await getUserById(managerId);
            if (user && user.fullName) {
              managerNames.push(user.fullName);
            } else {
              managerNames.push(managerId);
            }
          } catch (error) {
            console.error(`Failed to fetch manager ${managerId}:`, error);
            managerNames.push(managerId);
          }
        }
        return managerNames;
      })();

      // Map contract type
      const contractTypeMapping: Record<string, string> = {
        'Service Agreement': 'Service_Agreement',
        'Professional Services': 'Consulting_Agreement',
        'Purchase Agreement': 'Purchase_Order',
        'Purchase Order': 'Purchase_Order',
        'License Agreement': 'License_Agreement',
        'Confidentiality/NDA': 'NDA_',
        NDA: 'NDA_',
        'Employment Contract': 'Employment_Contract',
        'Vendor Contract': 'Vendor_Contract',
        'Lease Agreement': 'Lease_Agreement',
        'Consulting Agreement': 'Consulting_Agreement',
        'Statement of Work (SOW)': 'Consulting_Agreement',
        'Statement of Work': 'Consulting_Agreement',
        'Master Agreement': 'Service_Agreement',
        Amendment: 'Other',
        Other: 'Other',
      };

      const mappedContractType =
        contractTypeMapping[formData.contractType] || 'Other';

      // Calculate days until expiry
      const daysUntilExpiry = (() => {
        if (contractExpiryDate) {
          try {
            const expiryDate = new Date(contractExpiryDate);
            const today = new Date();
            const timeDiff = expiryDate.getTime() - today.getTime();
            return Math.ceil(timeDiff / (1000 * 3600 * 24));
          } catch (error) {
            return undefined;
          }
        }
        return undefined;
      })();

      const contractDocument = sanitizePayload({
        contractName: formData.contractName || processedFileData.name,
        contractExpiryDate,
        status,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : undefined,
        executionDate: formData.executionDate
          ? new Date(formData.executionDate).toISOString()
          : undefined,
        autoRenew: formData.autoRenew,
        renewalNoticeDays: formData.renewalNoticeDays
          ? parseInt(formData.renewalNoticeDays)
          : undefined,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        currencyCode: formData.currencyCode || 'USD',
        notToExceedAmount: formData.notToExceedAmount
          ? parseFloat(formData.notToExceedAmount)
          : undefined,
        paymentTerms: formData.paymentTerms,
        paymentSchedule: formData.paymentSchedule,
        budgetCode: formData.budgetCode,
        costCenter: formData.costCenter,
        daysUntilExpiry,
        compliance:
          formData.compliance ?? mapRiskToCompliance(formData.riskLevel),
        assignedManagers,
        department: formData.assignToDepartment || formData.department,
        businessUnit: formData.businessUnit,
        subDepartment: formData.subDepartment,
        departmentOwner: formData.departmentOwner,
        contractType: mappedContractType,
        contractCategory: formData.contractCategory,
        vendor: formData.vendor ?? formData.counterpartyLegalName,
        contractNumber: formData.contractNumber,
        priority: formData.priority ?? mapRiskToPriority(formData.riskLevel),
        description: formData.description,
        contractOwnerId: formData.contractOwnerId || ownerId,
        lifecycleStatus: formData.lifecycleStatus || 'draft',
        riskLevel: formData.riskLevel,
        fileId: result.fileRow.$id,
        fileRef: result.fileRow.$id,
        orgId: defaultOrg.orgId,
      });

      const contract = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId!,
        tableId: contractsCollectionId,
        rowId: ID.unique(),
        data: contractDocument,
      });

      result.contractRow = { $id: contract.$id };
      result.steps.push(`✓ Contract row created: ${contract.$id}`);

      // Update file row with contract metadata
      const fileUpdateData = sanitizePayload({
        contractId: contract.$id,
        contractExpiryDate,
        status,
        contractName: contractDocument.contractName,
        contractType: contractDocument.contractType,
        amount: contractDocument.amount,
        vendor: contractDocument.vendor,
        contractNumber: contractDocument.contractNumber,
        priority: contractDocument.priority,
        compliance: contractDocument.compliance,
        department: contractDocument.department,
        assignedManagers: contractDocument.assignedManagers,
      });

      await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId!,
        tableId: filesCollectionId,
        rowId: result.fileRow.$id,
        data: fileUpdateData,
      });

      result.steps.push(`✓ File row updated with contract metadata`);
    } catch (error: any) {
      result.steps.push(`✗ Failed to create contract row: ${error.message}`);
      return NextResponse.json(
        {
          success: false,
          result,
          error: 'Failed to create contract row',
          errorDetails: {
            message: error.message,
            code: error.code,
            type: error.type,
          },
        },
        { status: 500 }
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

    return NextResponse.json({
      success: true,
      result,
      message: 'Draft processed successfully',
    });
  } catch (error: any) {
    console.error('Error processing draft:', error);
    return NextResponse.json(
      {
        error: 'Failed to process draft',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
