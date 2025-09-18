import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const client = await createAdminClient();

    const res = await client.tablesDB.listRows({
      databaseId: '685ed87c0009d8189fc7',
      tableId: 'notifications',
      queries: [Query.equal('userId', userId)],
    });

    return NextResponse.json(res);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
