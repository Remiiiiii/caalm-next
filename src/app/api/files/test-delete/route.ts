import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId query parameter is required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const result: any = {
      fileId,
      steps: [] as string[],
      errors: [] as string[],
      success: false,
    };

    try {
      // Step 1: Try to get the file first
      result.steps.push('Step 1: Fetching file document...');
      const file = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: fileId,
      });
      result.steps.push(`✓ File found: ${file.name}`);

      // Step 2: Check if there's a contract with fileId pointing to this file
      if (appwriteConfig.contractsCollectionId) {
        result.steps.push('Step 2: Checking for contracts with fileId...');
        try {
          const { Query } = await import('node-appwrite');
          const contracts = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.contractsCollectionId,
            queries: [Query.equal('fileId', fileId)],
          });

          if (contracts.rows.length > 0) {
            result.steps.push(
              `⚠ Found ${contracts.rows.length} contract(s) with fileId=${fileId}`
            );
            result.contracts = contracts.rows.map((c: any) => ({
              $id: c.$id,
              contractName: c.contractName,
              fileId: c.fileId,
            }));

            // Try to clear fileId from contracts first
            result.steps.push('Step 3: Attempting to clear fileId from contracts...');
            for (const contract of contracts.rows) {
              try {
                await tablesDB.updateRow({
                  databaseId: appwriteConfig.databaseId,
                  tableId: appwriteConfig.contractsCollectionId,
                  rowId: contract.$id,
                  data: {
                    fileId: null,
                  },
                });
                result.steps.push(`✓ Cleared fileId from contract ${contract.$id}`);
              } catch (error: any) {
                result.errors.push(
                  `Failed to clear fileId from contract ${contract.$id}: ${error.message}`
                );
                result.steps.push(
                  `✗ Failed to clear fileId from contract ${contract.$id}: ${error.message}`
                );
              }
            }
          } else {
            result.steps.push('✓ No contracts found with fileId');
          }
        } catch (error: any) {
          result.errors.push(`Error checking contracts: ${error.message}`);
          result.steps.push(`✗ Error checking contracts: ${error.message}`);
        }
      }

      // Step 3: Clear owner relationship first (two-way relationship issue)
      if (file.owner) {
        result.steps.push('Step 3: Clearing owner relationship...');
        try {
          await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesCollectionId,
            rowId: fileId,
            data: {
              owner: null,
            },
          });
          result.steps.push('✓ Owner relationship cleared');
        } catch (error: any) {
          result.errors.push(`Failed to clear owner: ${error.message}`);
          result.steps.push(`⚠ Could not clear owner: ${error.message}`);
          // Continue anyway - might still work
        }
      } else {
        result.steps.push('Step 3: No owner relationship to clear');
      }

      // Step 4: Try to delete the file
      result.steps.push('Step 4: Attempting to delete file document...');
      try {
        await tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.filesCollectionId,
          rowId: fileId,
        });
        result.steps.push('✓ File deleted successfully!');
        result.success = true;
      } catch (error: any) {
        result.errors.push(`Deletion failed: ${error.message}`);
        result.steps.push(`✗ Deletion failed: ${error.message}`);
        result.errorDetails = {
          code: error?.code,
          message: error?.message,
          type: error?.type,
          response: error?.response,
        };
        throw error;
      }
    } catch (error: any) {
      result.errors.push(`Operation failed: ${error.message}`);
      result.errorDetails = {
        code: error?.code,
        message: error?.message,
        type: error?.type,
        response: error?.response,
      };
    }

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error: any) {
    console.error('Test delete error:', error);
    return NextResponse.json(
      {
        error: 'Test delete failed',
        message: error?.message || 'Unknown error',
        details: {
          code: error?.code,
          type: error?.type,
          response: error?.response,
        },
      },
      { status: 500 }
    );
  }
}

