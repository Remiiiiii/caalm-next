import { NextRequest, NextResponse } from 'next/server';
import { getFiles } from '@/lib/actions/file.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 10;

    // Fetch recent files
    const filesResponse = await getFiles({
      types: [],
      limit,
      sort: '$createdAt-desc', // Most recent first
    });

    return NextResponse.json({ data: filesResponse.documents || [] });
  } catch (error) {
    console.error('Failed to fetch dashboard files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard files' },
      { status: 500 }
    );
  }
}
