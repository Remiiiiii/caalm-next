import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { constructFileUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contract ID is required',
        },
        { status: 400 }
      );
    }

    const { tablesDB, databases, storage } = await createAdminClient();

    // Fetch contract from database
    const contract = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.contractsCollectionId || 'contracts',
      rowId: contractId,
    });

    if (!contract) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contract not found',
        },
        { status: 404 }
      );
    }

    let fileUrl = '';
    let fileExtension = 'pdf';

    // If contract has fileId, fetch file details
    if (contract.fileId) {
      try {
        const fileDoc = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.filesCollectionId || 'files',
          rowId: contract.fileId,
          queries: [],
        });

        if (fileDoc && fileDoc.url) {
          fileUrl = fileDoc.url;
        }
        if (fileDoc && fileDoc.extension) {
          fileExtension = fileDoc.extension;
        }
      } catch (fileError) {
        console.warn('Failed to fetch file details:', fileError);
        // Try to construct file URL from storage if fileId is a storage file ID
        try {
          fileUrl = constructFileUrl(contract.fileId);
        } catch (storageError) {
          console.warn('Failed to construct file URL:', storageError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.$id,
        contractName: contract.contractName || 'Unnamed Contract',
        description: contract.description || '',
        contractType: contract.contractType || '',
        vendor: contract.vendor || '',
        amount: contract.amount || '',
        contractNumber: contract.contractNumber || '',
        contractExpiryDate: contract.contractExpiryDate || '',
        status: contract.status || '',
        fileId: contract.fileId || '',
        fileUrl: fileUrl,
        fileExtension: fileExtension,
      },
    });
  } catch (error) {
    console.error('Error fetching contract details:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch contract details',
      },
      { status: 500 }
    );
  }
}
