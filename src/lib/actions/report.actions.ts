'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { model } from '@/lib/ai/gemini';
// Fluent Reports import removed - will be handled server-side only

export interface GenerateReportData {
  userId: string;
  userRole: string;
  department: string;
  userName: string;
}

export interface ReportData {
  $id: string;
  title: string;
  department: string;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
  content?: string;
  pdfContent?: string; // Base64 encoded PDF content
  contractsCount: number;
  usersCount: number;
  eventsCount: number;
  filesCount: number;
  userId: string;
  userName: string;
  userRole: string;
}

/**
 * Generate a comprehensive report using AI
 */
export async function generateReport(
  data: GenerateReportData
): Promise<ReportData> {
  console.log('Starting report generation with data:', data);
  const adminClient = await createAdminClient();

  try {
    console.log('Fetching metrics...');
    // Fetch metrics for all collections
    let metrics;
    try {
      metrics = await getMetricsForDepartment();
      console.log('Metrics fetched:', metrics);
    } catch (metricsError) {
      console.error('Metrics fetching failed, using defaults:', metricsError);
      metrics = {
        contracts: 0,
        users: 0,
        events: 0,
        files: 0,
      };
    }

    console.log('Generating AI analysis...');
    // Generate AI analysis
    let aiContent: string;
    try {
      aiContent = await generateAIAnalysis({
        department: data.department,
        metrics,
        userRole: data.userRole,
        userName: data.userName,
      });
      console.log('AI analysis generated, length:', aiContent.length);
    } catch (aiError) {
      console.error('AI analysis failed, using fallback:', aiError);
      aiContent = `<h2>Report for ${
        data.department
      }</h2><p>AI analysis temporarily unavailable. Report generated on ${new Date().toLocaleString()}.</p>`;
    }

    // Create report document
    const reportId = ID.unique();

    // Generate PDF report using server-side Fluent Reports
    let pdfGenerated = false;
    let pdfFilePath: string | undefined;
    try {
      const pdfResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/api/reports/generate-react-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportId,
            department: data.department,
            metrics,
            userRole: data.userRole,
            userName: data.userName,
            aiContent,
          }),
        }
      );

      if (pdfResponse.ok) {
        const pdfResult = await pdfResponse.json();
        pdfGenerated = true;
        pdfFilePath = pdfResult.pdfPath;
        console.log('PDF generated successfully:', pdfResult.pdfPath);
      } else {
        console.error('PDF generation failed:', await pdfResponse.text());
      }
    } catch (pdfError) {
      console.error('PDF generation failed, continuing without PDF:', pdfError);
    }
    const reportTitle = `${
      data.department === 'all' ? 'All Departments' : data.department
    } Report`;

    const reportData = {
      title: reportTitle,
      generatedAt: new Date().toISOString(),
      status: 'completed' as const,
      content: aiContent,
      pdfGenerated: pdfGenerated,
      pdfFilePath: pdfFilePath,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      division:
        data.department === 'all'
          ? 'all'
          : data.department.toLowerCase().replace(/\s+/g, '-'),
      contractsCount: metrics.contracts,
      usersCount: metrics.users,
      eventsCount: metrics.events,
      filesCount: metrics.files,
      // Store department info in reportData field for additional context
      reportData: JSON.stringify({
        department: data.department,
        metrics: metrics,
        generatedBy: data.userName,
        generatedRole: data.userRole,
      }),
    };

    console.log('Creating report document:', {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.reportsCollectionId,
      reportId,
      reportDataKeys: Object.keys(reportData),
      reportData: reportData,
    });

    console.log('Attempting to create document in Appwrite...');
    const createdDocument = await adminClient.tablesDB.createRow(
      appwriteConfig.databaseId,
      appwriteConfig.reportsCollectionId,
      reportId,
      reportData
    );
    console.log('Document created successfully:', createdDocument.$id);

    console.log('Report document created successfully');

    return {
      $id: createdDocument.$id,
      title: reportData.title,
      department: data.department, // Keep department in the return for compatibility
      generatedAt: reportData.generatedAt,
      status: reportData.status,
      content: reportData.content,
      pdfContent: undefined, // No PDF content for now
      contractsCount: metrics.contracts,
      usersCount: metrics.users,
      eventsCount: metrics.events,
      filesCount: metrics.files,
      userId: reportData.userId,
      userName: reportData.userName,
      userRole: reportData.userRole,
    };
  } catch (error) {
    console.error('Error generating report:', error);
    console.error('Error details:', {
      userId: data.userId,
      userRole: data.userRole,
      department: data.department,
      userName: data.userName,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorCode: (error as { code?: string })?.code,
      errorResponse: (error as { response?: unknown })?.response,
    });

    // Re-throw the original error to preserve the full error details
    throw error;
  }
}

/**
 * Get metrics for a specific department
 */
async function getMetricsForDepartment() {
  const adminClient = await createAdminClient();

  try {
    console.log('Fetching metrics with config:', {
      databaseId: appwriteConfig.databaseId,
      contractsCollectionId: appwriteConfig.contractsCollectionId,
      usersCollectionId: appwriteConfig.usersCollectionId,
      calendarEventsCollectionId: appwriteConfig.calendarEventsCollectionId,
      filesCollectionId: appwriteConfig.filesCollectionId,
    });

    // Fetch contracts count
    const contractsQuery = [Query.limit(1)];
    // Note: Contracts may not have department field, so we'll get all contracts
    const contractsResponse = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId || 'contracts',
      contractsQuery
    );
    console.log('Contracts response:', { total: contractsResponse.total });

    // Fetch users count
    const usersQuery = [Query.limit(1)];
    // Note: Users may not have department field, so we'll get all users
    const usersResponse = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId || 'users',
      usersQuery
    );

    // Fetch events count
    const eventsQuery = [Query.limit(1)];
    // Note: Calendar events may not have department field, so we'll get all events
    const eventsResponse = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId || 'calendar',
      eventsQuery
    );

    // Fetch files count
    const filesQuery = [Query.limit(1)];
    // Note: Files may not have department field, so we'll get all files
    const filesResponse = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId || 'files',
      filesQuery
    );

    return {
      contracts: contractsResponse.total || 0,
      users: usersResponse.total || 0,
      events: eventsResponse.total || 0,
      files: filesResponse.total || 0,
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    console.error('Metrics error details:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return {
      contracts: 0,
      users: 0,
      events: 0,
      files: 0,
    };
  }
}

/**
 * Download report as PDF
 */
export async function downloadReport(
  reportId: string,
  reportTitle: string
): Promise<void> {
  try {
    // This would typically generate a PDF using a library like jsPDF or puppeteer
    // For now, we'll create a simple text file download

    const content = `Report: ${reportTitle}\nGenerated on: ${new Date().toLocaleString()}\n\nThis is a placeholder for the actual PDF content.`;

    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw new Error('Failed to download report');
  }
}

// PDF download functionality removed - will be implemented server-side only

/**
 * Upload report to Documents
 */
export async function uploadReport(
  reportId: string,
  reportTitle: string,
  userId?: string
): Promise<void> {
  try {
    const adminClient = await createAdminClient();

    // Create a file entry in the documents collection
    const fileData = {
      name: reportTitle,
      type: 'pdf',
      size: 0, // You'd get actual file size
      uploadedBy: userId,
      department: 'all', // Reports are available to all departments
      category: 'reports',
      url: `/reports/${reportId}`, // This would be the actual file URL
      uploadedAt: new Date().toISOString(),
    };

    // Store in files collection
    await adminClient.tablesDB.createRow(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId || 'files',
      ID.unique(),
      fileData
    );

    // Create activity log
    // await createFileActivity(
    //   'Report Uploaded',
    //   reportTitle,
    //   userId,
    //   'System',
    //   'all'
    // );
  } catch (error) {
    console.error('Error uploading report:', error);
    throw new Error('Failed to upload report');
  }
}

// PDF generation is now handled server-side via /api/reports/generate-pdf

/**
 * Generate AI-powered report analysis using Gemini
 */
async function generateAIAnalysis(data: {
  department: string;
  metrics: {
    contracts: number;
    users: number;
    events: number;
    files: number;
  };
  userRole: string;
  userName: string;
}): Promise<string> {
  const { department, metrics, userRole, userName } = data;

  console.log('Starting AI analysis generation:', {
    department,
    metrics,
    userRole,
    userName,
  });

  try {
    console.log('Creating AI prompt...');
    const prompt = `
      You are an AI business analyst creating a comprehensive department report for a healthcare organization.
      
      Department: ${department === 'all' ? 'All Departments' : department}
      Generated by: ${userName} (${userRole})
      Generated on: ${new Date().toLocaleString()}
      
      Current Metrics:
      - Total Contracts: ${metrics.contracts}
      - Active Users: ${metrics.users}
      - Scheduled Events: ${metrics.events}
      - Stored Files: ${metrics.files}
      
      Please create a professional, business-style report in HTML format that includes:
      
      1. Executive Summary (2-3 paragraphs)
      2. Key Performance Indicators analysis
      3. Department-specific insights and trends
      4. Risk assessment and compliance considerations
      5. Strategic recommendations for improvement
      6. Action items and next steps
      
      The report should be:
      - Professional and business-focused
      - Data-driven with specific insights
      - Actionable with clear recommendations
      - Suitable for executive presentation
      - Written in a healthcare/medical context
      
      Format the response as clean HTML with proper headings (h2, h3), paragraphs, lists, and emphasis tags.
      Do not include any meta tags, DOCTYPE, or full HTML document structure - just the content.
    `;

    console.log('Calling Gemini AI model...');
    const result = await model.generateContent(prompt);
    console.log('Got result from Gemini');
    const response = await result.response;
    console.log('Got response from Gemini');
    const text = response.text();
    console.log('Extracted text from Gemini response, length:', text.length);

    // Ensure the response is properly formatted HTML
    const formattedResponse = text
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    return (
      formattedResponse ||
      `
      <h2>${
        department === 'all' ? 'All Departments' : department
      } Department Report</h2>
      <p><strong>Generated by:</strong> ${userName} (${userRole})</p>
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Executive Summary</h3>
      <p>This report provides a comprehensive overview of the ${
        department === 'all' ? 'organization' : department
      } department's current status and performance metrics.</p>
      
      <h3>Key Metrics</h3>
      <ul>
        <li><strong>Total Contracts:</strong> ${metrics.contracts}</li>
        <li><strong>Active Users:</strong> ${metrics.users}</li>
        <li><strong>Scheduled Events:</strong> ${metrics.events}</li>
        <li><strong>Stored Files:</strong> ${metrics.files}</li>
      </ul>
      
      <h3>Analysis</h3>
      <p>Based on the current metrics, the department shows ${
        metrics.contracts > 10 ? 'strong' : 'moderate'
      } contract management activity with ${
        metrics.users
      } active users contributing to operations.</p>
      
      <h3>Recommendations</h3>
      <ul>
        <li>Continue monitoring contract expiration dates</li>
        <li>Ensure regular compliance training completion</li>
        <li>Maintain organized file management practices</li>
      </ul>
    `
    );
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    console.error('AI analysis error details:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      department,
      metrics,
    });

    // Fallback to a basic report if AI fails
    return `
      <h2>${
        department === 'all' ? 'All Departments' : department
      } Department Report</h2>
      <p><strong>Generated by:</strong> ${userName} (${userRole})</p>
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Executive Summary</h3>
      <p>This report provides a comprehensive overview of the ${
        department === 'all' ? 'organization' : department
      } department's current status and performance metrics.</p>
      
      <h3>Key Metrics</h3>
      <ul>
        <li><strong>Total Contracts:</strong> ${metrics.contracts}</li>
        <li><strong>Active Users:</strong> ${metrics.users}</li>
        <li><strong>Scheduled Events:</strong> ${metrics.events}</li>
        <li><strong>Stored Files:</strong> ${metrics.files}</li>
      </ul>
      
      <h3>Analysis</h3>
      <p>Based on the current metrics, the department shows ${
        metrics.contracts > 10 ? 'strong' : 'moderate'
      } contract management activity with ${
      metrics.users
    } active users contributing to operations.</p>
      
      <h3>Recommendations</h3>
      <ul>
        <li>Continue monitoring contract expiration dates</li>
        <li>Ensure regular compliance training completion</li>
        <li>Maintain organized file management practices</li>
      </ul>
    `;
  }
}

/**
 * Get user's accessible departments based on role
 */
export async function getUserAccessibleDepartments(
  userRole: string,
  userDivision?: string
): Promise<string[]> {
  if (userRole === 'executive') {
    return [
      'IT',
      'Finance',
      'Administration',
      'Legal',
      'Operations',
      'Sales',
      'Marketing',
      'Engineering',
      'Other',
    ];
  } else if (userRole === 'admin') {
    return ['IT', 'Finance', 'Administration', 'Legal', 'Operations'];
  } else if (userRole === 'manager' && userDivision) {
    // Managers can access all departments for contract management
    return [
      'IT',
      'Finance',
      'Administration',
      'Legal',
      'Operations',
      'Sales',
      'Marketing',
      'Engineering',
      'Other',
    ];
  }

  return [];
}

/**
 * Delete a report by ID
 */
export async function deleteReport(reportId: string): Promise<void> {
  console.log('Deleting report:', reportId);
  const adminClient = await createAdminClient();

  try {
    // First get the report data to check for PDF file
    let pdfFilePath: string | undefined;
    try {
      const report = await adminClient.tablesDB.getRow(
        appwriteConfig.databaseId,
        appwriteConfig.reportsCollectionId,
        reportId
      );
      pdfFilePath = report.pdfFilePath;
    } catch (getError) {
      console.warn('Could not fetch report data before deletion:', getError);
    }

    // Delete the report document from Appwrite
    await adminClient.tablesDB.deleteRow(
      appwriteConfig.databaseId,
      appwriteConfig.reportsCollectionId,
      reportId
    );

    // Also delete the PDF file if it exists
    if (pdfFilePath) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const pdfPath = path.join(process.cwd(), 'public', pdfFilePath);

        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          console.log('PDF file deleted:', pdfPath);
        }
      } catch (fileError) {
        // If we can't delete the file, log it but don't fail the operation
        console.warn('Could not delete PDF file:', fileError);
      }
    }

    console.log('Report deleted successfully:', reportId);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw new Error(
      `Failed to delete report: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
