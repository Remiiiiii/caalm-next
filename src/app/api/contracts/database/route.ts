import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

export async function GET(request: NextRequest) {
  try {
    const { tablesDB } = await createAdminClient();

    // Fetch all contracts from database
    const contracts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.contractsCollectionId || 'contracts',
      queries: [
        Query.select(['$id', 'contractName', 'contractType', 'vendor']),
        Query.limit(1000), // Get up to 1000 contracts
      ],
    });

    // Map contracts to simple format for dropdown
    const contractList = contracts.rows.map((contract: any) => ({
      id: contract.$id,
      name: contract.contractName || 'Unnamed Contract',
      type: contract.contractType,
      vendor: contract.vendor,
    }));

    return NextResponse.json({
      success: true,
      contracts: contractList,
    });
  } catch (error) {
    console.error('Error fetching contracts from database:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch contracts',
      },
      { status: 500 }
    );
  }
}
