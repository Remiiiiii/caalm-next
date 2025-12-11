import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

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
      fixes: [] as string[],
    };

    try {
      // Step 1: Get the file
      result.steps.push('Step 1: Fetching file document...');
      const file = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: fileId,
      });
      result.steps.push(`✓ File found: ${file.name}`);

      const updateData: any = {};

      // Step 2: Fix assignedManagers array (remove null values)
      if (Array.isArray(file.assignedManagers)) {
        const hasNulls = file.assignedManagers.some((m: any) => m === null || m === undefined);
        if (hasNulls) {
          const cleaned = file.assignedManagers.filter((m: any) => m !== null && m !== undefined);
          updateData.assignedManagers = cleaned.length > 0 ? cleaned : [];
          result.fixes.push('Cleaned assignedManagers array (removed null values)');
          result.steps.push('✓ Fixed assignedManagers array');
        }
      }

      // Step 3: Clear owner relationship and try to work around two-way relationship issue
      if (file.owner) {
        const ownerId = typeof file.owner === 'string' ? file.owner : file.owner.$id;
        result.steps.push(`Step 3: Clearing two-way relationship with user ${ownerId}...`);
        
        try {
          const user = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.usersCollectionId!,
            rowId: ownerId,
          });
          
          result.steps.push(`✓ User found: ${user.fullName || user.email}`);
          
          // The user's 'files' relationship is a two-way relationship that Appwrite manages automatically
          // When we delete a file, Appwrite tries to update the user's 'files' relationship
          // If that update fails, the deletion fails. We can't directly manipulate relationship attributes,
          // but we can try to force Appwrite to refresh by updating the user document with a no-op change
          // This might help Appwrite recognize that the relationship needs to be updated
          try {
            // Try a minimal update to trigger relationship refresh
            // Updating a non-relationship field might help Appwrite process the relationship change
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.usersCollectionId!,
              rowId: ownerId,
              data: {
                // No-op update - just touch the document to trigger relationship processing
                // We'll update a field that won't change the value
                status: user.status || 'active',
              },
            });
            result.steps.push(`✓ Triggered user document update to refresh relationships`);
          } catch (updateError: any) {
            result.steps.push(`⚠ Could not update user document: ${updateError.message}`);
            // Continue anyway
          }
          
        } catch (error: any) {
          result.steps.push(`⚠ Could not fetch user: ${error.message}`);
          // Continue anyway - clearing owner should be enough
        }
        
        // Clear owner relationship on the file FIRST
        // This should automatically update the user's files relationship
        // But we need to do this BEFORE trying to delete, and wait for it to propagate
        updateData.owner = null;
        result.fixes.push('Cleared owner relationship (will auto-update user files relationship)');
        result.steps.push('✓ Cleared owner relationship');
      }

      // Step 4: Check for licenses with fileRef pointing to this file
      result.steps.push('Step 2: Checking for licenses with fileRef...');
      try {
        const licenses = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: '6912f13200a9f1234567', // Licenses collection
          queries: [],
        });

        // Filter in memory since query might not work
        const licensesWithFileRef = licenses.rows.filter(
          (l: any) => l.fileRef === fileId || (typeof l.fileRef === 'object' && l.fileRef?.$id === fileId)
        );

        if (licensesWithFileRef.length > 0) {
          result.steps.push(`⚠ Found ${licensesWithFileRef.length} license(s) with fileRef`);
          result.licenses = licensesWithFileRef.map((l: any) => ({
            $id: l.$id,
            licenseName: l.licenseName,
            fileRef: l.fileRef,
          }));

          // Clear fileRef from licenses
          result.steps.push('Step 3: Clearing fileRef from licenses...');
          for (const license of licensesWithFileRef) {
            try {
              await tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: '6912f13200a9f1234567',
                rowId: license.$id,
                data: {
                  fileRef: null,
                },
              });
              result.steps.push(`✓ Cleared fileRef from license ${license.$id}`);
              result.fixes.push(`Cleared fileRef from license ${license.licenseName}`);
            } catch (error: any) {
              result.errors.push(`Failed to clear fileRef from license ${license.$id}: ${error.message}`);
              result.steps.push(`✗ Failed to clear fileRef from license ${license.$id}`);
            }
          }
        } else {
          result.steps.push('✓ No licenses found with fileRef');
        }
      } catch (error: any) {
        result.errors.push(`Error checking licenses: ${error.message}`);
        result.steps.push(`⚠ Could not check licenses: ${error.message}`);
      }

      // Step 5: Check for contracts with fileId (not fileRef)
      if (appwriteConfig.contractsCollectionId) {
        result.steps.push('Step 4: Checking for contracts with fileId...');
        try {
          const contracts = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.contractsCollectionId,
            queries: [],
          });

          const contractsWithFileId = contracts.rows.filter(
            (c: any) => c.fileId === fileId
          );

          if (contractsWithFileId.length > 0) {
            result.steps.push(`⚠ Found ${contractsWithFileId.length} contract(s) with fileId`);
            result.contracts = contractsWithFileId.map((c: any) => ({
              $id: c.$id,
              contractName: c.contractName,
              fileId: c.fileId,
            }));

            // Clear fileId from contracts
            result.steps.push('Step 5: Clearing fileId from contracts...');
            for (const contract of contractsWithFileId) {
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
                result.fixes.push(`Cleared fileId from contract ${contract.contractName}`);
              } catch (error: any) {
                result.errors.push(`Failed to clear fileId from contract ${contract.$id}: ${error.message}`);
                result.steps.push(`✗ Failed to clear fileId from contract ${contract.$id}`);
              }
            }
          } else {
            result.steps.push('✓ No contracts found with fileId');
          }
        } catch (error: any) {
          result.errors.push(`Error checking contracts: ${error.message}`);
          result.steps.push(`⚠ Could not check contracts: ${error.message}`);
        }
      }

      // Step 6: Fix bucketFileId if it's missing but URL suggests it exists
      if (!file.bucketFileId && file.url) {
        // Extract bucketFileId from URL if possible
        const urlMatch = file.url.match(/\/files\/([^\/\?]+)/);
        if (urlMatch && urlMatch[1]) {
          updateData.bucketFileId = urlMatch[1];
          result.fixes.push(`Restored bucketFileId from URL: ${urlMatch[1]}`);
          result.steps.push(`✓ Fixed bucketFileId from URL`);
        }
      }

      // Step 7: Apply fixes to the file document
      if (Object.keys(updateData).length > 0) {
        result.steps.push('Step 7: Applying fixes to file document...');
        try {
          await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesCollectionId,
            rowId: fileId,
            data: updateData,
          });
          result.steps.push('✓ File document updated with fixes');
        } catch (error: any) {
          result.errors.push(`Failed to update file: ${error.message}`);
          result.steps.push(`✗ Failed to update file: ${error.message}`);
        }
      } else {
        result.steps.push('Step 7: No file document fixes needed');
      }

      // Step 8: Wait longer for Appwrite to process relationship updates
      // Two-way relationships can take time to propagate
      result.steps.push('Step 8: Waiting for relationship updates to propagate (3 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 9: Try to delete the file directly to get the exact error
      result.steps.push('Step 9: Attempting direct deletion to capture error...');
      try {
        await tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.filesCollectionId,
          rowId: fileId,
        });
        result.steps.push('✓ File deleted successfully!');
        result.deleted = true;
      } catch (error: any) {
        result.errors.push(`Deletion failed: ${error.message}`);
        result.steps.push(`✗ Deletion failed: ${error.message}`);
        result.deletionError = {
          code: error?.code,
          message: error?.message,
          type: error?.type,
          response: error?.response,
          status: error?.status,
        };
        
        // If deletion fails, try one more time after clearing contractId if it exists
        if (file.contractId) {
          result.steps.push('Step 10: Retrying after clearing contractId...');
          try {
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.filesCollectionId,
              rowId: fileId,
              data: { contractId: null },
            });
            result.steps.push('✓ Cleared contractId, retrying deletion...');
            
            // Wait again
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try deletion again
            await tablesDB.deleteRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.filesCollectionId,
              rowId: fileId,
            });
            result.steps.push('✓ File deleted successfully on retry!');
            result.deleted = true;
            result.errors = []; // Clear errors since it succeeded
          } catch (retryError: any) {
            result.errors.push(`Retry deletion failed: ${retryError.message}`);
            result.steps.push(`✗ Retry deletion failed: ${retryError.message}`);
          }
        }
      }

      result.steps.push('✓ Preparation complete! Try deleting the file now.');
    } catch (error: any) {
      result.errors.push(`Operation failed: ${error.message}`);
      result.errorDetails = {
        code: error?.code,
        message: error?.message,
        type: error?.type,
      };
    }

    return NextResponse.json({
      success: result.errors.length === 0,
      result,
    });
  } catch (error: any) {
    console.error('Prepare deletion error:', error);
    return NextResponse.json(
      {
        error: 'Prepare deletion failed',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

