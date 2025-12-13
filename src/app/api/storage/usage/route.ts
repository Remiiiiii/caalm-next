import { NextRequest, NextResponse } from 'next/server';
import { getTotalSpaceUsed } from '@/lib/actions/file.actions';

export async function GET(request: NextRequest) {
  try {
    const totalSpace = await getTotalSpaceUsed();
    return NextResponse.json(totalSpace);
  } catch (error: any) {
    console.error('Failed to fetch storage usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage usage', message: error.message },
      { status: 500 }
    );
  }
}

