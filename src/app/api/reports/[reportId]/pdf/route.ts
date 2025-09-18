import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

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

    // Check if PDF was generated and file path exists
    if (!report.pdfGenerated || !report.pdfFilePath) {
      return NextResponse.json(
        { error: 'PDF not available for this report' },
        { status: 404 }
      );
    }

    // Read the file from the public directory
    const filePath = path.join(process.cwd(), 'public', report.pdfFilePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Report file not found on server' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(report.pdfFilePath).toLowerCase();

    // Determine content type based on file extension
    let contentType = 'application/pdf';
    let filename = `${report.title || 'report'}.pdf`;

    if (fileExtension === '.html') {
      contentType = 'text/html';
      filename = `${report.title || 'report'}.html`;
    }

    // Return the file as a response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching PDF report:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch PDF report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
