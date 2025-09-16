import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import React from 'react';
import { ReportDocument } from '@/components/pdf/ReportDocument';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, department, metrics, userRole, userName, aiContent } =
      body;

    if (
      !reportId ||
      !department ||
      !metrics ||
      !userRole ||
      !userName ||
      !aiContent
    ) {
      return NextResponse.json(
        { error: 'Missing required fields for PDF generation' },
        { status: 400 }
      );
    }

    // Create report data
    const reportData = {
      reportId,
      department,
      metrics,
      userRole,
      userName,
      aiContent,
      generatedAt: new Date().toISOString(),
      reportTitle: `${
        department === 'all' ? 'All Departments' : department
      } Analytics Report`,
    };

    // Generate PDF stream using react-pdf
    const pdfStream = await renderToStream(
      React.createElement(ReportDocument, { data: reportData })
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Store PDF file in the public directory
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const pdfFileName = `report_${reportId}.pdf`;
    const pdfPath = path.join(reportsDir, pdfFileName);

    fs.writeFileSync(pdfPath, pdfBuffer);

    // Try to update the report document with PDF file path if it exists
    try {
      const adminClient = await createAdminClient();
      await adminClient.databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.reportsCollectionId,
        reportId,
        {
          pdfFilePath: `/reports/${pdfFileName}`,
          pdfGenerated: true,
        }
      );
    } catch (updateError) {
      console.log(
        'Report document not found, will be updated when report is created:',
        updateError
      );
    }

    return NextResponse.json({
      success: true,
      pdfPath: `/reports/${pdfFileName}`,
      message: 'PDF generated successfully with react-pdf',
    });
  } catch (error) {
    console.error('Error generating PDF with react-pdf:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
