import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const { reportId } = params;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Get the report document
    const report = await adminClient.tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.reportsCollectionId,
      rowId: reportId,
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Return the report content as HTML
    const content =
      report.content || '<p>No content available for this report.</p>';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error fetching report content:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch report content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
