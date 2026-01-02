import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

/**
 * Shared function to update expired contracts
 * Used by both POST and GET (cron) endpoints
 */
async function updateExpiredContracts() {
  const { tablesDB } = await createAdminClient();

  if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
    throw new Error('Database or collection ID not configured');
  }

  // Get all contracts with expiry dates that are not yet marked as expired
  const contracts = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.contractsCollectionId,
    queries: [
      Query.isNotNull('contractExpiryDate'),
      // Only get contracts that are not already marked as expired
      Query.notEqual('isExpired', true),
      Query.limit(1000), // Process in batches
    ],
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to start of day for date comparison

  let updatedCount = 0;
  const errors: string[] = [];

  // Process each contract
  for (const contract of contracts.rows) {
    if (!contract.contractExpiryDate) continue;

    try {
      // Parse expiry date (handle both date-only and datetime strings)
      const expiryStr = contract.contractExpiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);

      // Check if contract has expired (expiry date is in the past)
      const isExpired = expiryDate < now;

      if (isExpired && contract.isExpired !== true) {
        // Update the contract to mark it as expired
        await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractsCollectionId,
          rowId: contract.$id,
          data: {
            isExpired: true,
          },
        });

        updatedCount++;
        console.log(
          `✓ Marked contract "${contract.contractName}" (${contract.$id}) as expired`
        );
      }
    } catch (error: any) {
      const errorMsg = `Failed to update contract ${contract.$id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(errorMsg, error);
    }
  }

  return {
    message: `Updated ${updatedCount} expired contract(s)`,
    updatedCount,
    totalChecked: contracts.rows.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * POST endpoint to manually trigger expired contracts update
 * Can be called programmatically or via API
 * 
 * POST /api/contracts/update-expired
 */
export async function POST(request: NextRequest) {
  try {
    const result = await updateExpiredContracts();

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount,
      totalChecked: result.totalChecked,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating expired contracts:', error);
    return NextResponse.json(
      {
        error: 'Failed to update expired contracts',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status of expired contracts update
 * Also handles Vercel Cron requests (with Authorization header)
 * 
 * Vercel Cron calls this endpoint daily at 1 AM UTC (schedule: "0 1 * * *")
 * 
 * GET /api/contracts/update-expired
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel Cron request (has Authorization header with Bearer token)
    const authHeader = request.headers.get('authorization');
    const isCronRequest = authHeader?.startsWith('Bearer ');

    if (isCronRequest) {
      // This is a cron job request - update expired contracts
      console.log('[CRON] Updating expired contracts...');
      
      const result = await updateExpiredContracts();
      
      console.log('[CRON] Expired contracts update complete:', result);
      
      return NextResponse.json({
        success: true,
        message: result.message,
        updatedCount: result.updatedCount,
        totalChecked: result.totalChecked,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    } else {
      // This is a status check request
      const { tablesDB } = await createAdminClient();

      if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
        return NextResponse.json(
          { error: 'Database or collection ID not configured' },
          { status: 500 }
        );
      }

      // Count expired contracts
      const expiredContracts = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractsCollectionId,
        queries: [
          Query.equal('isExpired', true),
          Query.limit(1), // Just need count
        ],
      });

      // Count total contracts with expiry dates
      const totalContracts = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractsCollectionId,
        queries: [
          Query.isNotNull('contractExpiryDate'),
          Query.limit(1), // Just need count
        ],
      });

      return NextResponse.json({
        expiredCount: expiredContracts.total,
        totalContractsWithExpiry: totalContracts.total,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/contracts/update-expired:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
