import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import fs from 'fs';
import path from 'path';

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
    const report = await adminClient.databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reportsCollectionId,
      reportId
    );

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

    // Read the PDF file from the public directory
    const pdfPath = path.join(process.cwd(), 'public', report.pdfFilePath);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF file not found on server' },
        { status: 404 }
      );
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${
          report.title || 'report'
        }.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
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
