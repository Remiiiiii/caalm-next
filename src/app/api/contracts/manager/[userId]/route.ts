import { NextRequest, NextResponse } from 'next/server';
import { getContractsForManager } from '@/lib/actions/file.actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log('Fetching contracts for manager:', userId);

    const contracts = await getContractsForManager(userId);
    console.log('Contracts fetched for manager:', contracts?.length || 0);

    return NextResponse.json(contracts || []);
  } catch (error) {
    console.error('Error fetching manager contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manager contracts' },
      { status: 500 }
    );
  }
}
