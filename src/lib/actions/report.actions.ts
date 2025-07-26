'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { model } from '@/lib/ai/gemini';

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
  const adminClient = await createAdminClient();

  try {
    // Fetch metrics for all collections
    const metrics = await getMetricsForDepartment();

    // Generate AI analysis
    const aiContent = await generateAIAnalysis({
      department: data.department,
      metrics,
      userRole: data.userRole,
      userName: data.userName,
    });

    // Create report document
    const reportId = ID.unique();
    const reportTitle = `${
      data.department === 'all' ? 'All Departments' : data.department
    } Report - ${new Date().toLocaleDateString()}`;

    const reportData = {
      $id: reportId,
      title: reportTitle,
      department: data.department,
      generatedAt: new Date().toISOString(),
      status: 'completed' as const,
      content: aiContent,
      contractsCount: metrics.contracts,
      usersCount: metrics.users,
      eventsCount: metrics.events,
      filesCount: metrics.files,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
    };

    console.log('Creating report document:', {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.reportsCollectionId,
      reportId,
      reportDataKeys: Object.keys(reportData),
    });

    await adminClient.databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reportsCollectionId,
      reportId,
      reportData
    );

    console.log('Report document created successfully');

    return reportData;
  } catch (error) {
    console.error('Error generating report:', error);
    console.error('Error details:', {
      userId: data.userId,
      userRole: data.userRole,
      department: data.department,
      userName: data.userName,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to generate report: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get metrics for a specific department
 */
async function getMetricsForDepartment() {
  const adminClient = await createAdminClient();

  try {
    // Fetch contracts count
    const contractsQuery = [Query.limit(1)];
    // Note: Contracts may not have department field, so we'll get all contracts
    const contractsResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId || 'contracts',
      contractsQuery
    );

    // Fetch users count
    const usersQuery = [Query.limit(1)];
    // Note: Users may not have department field, so we'll get all users
    const usersResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId || 'users',
      usersQuery
    );

    // Fetch events count
    const eventsQuery = [Query.limit(1)];
    // Note: Calendar events may not have department field, so we'll get all events
    const eventsResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId || 'calendar',
      eventsQuery
    );

    // Fetch files count
    const filesQuery = [Query.limit(1)];
    // Note: Files may not have department field, so we'll get all files
    const filesResponse = await adminClient.databases.listDocuments(
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
    await adminClient.databases.createDocument(
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
  userDepartment?: string
): Promise<string[]> {
  if (userRole === 'executive') {
    return [
      'Administration',
      'C-Suite',
      'Management',
      'CFS',
      'Behavioral Health',
      'Child Welfare',
      'Clinic',
      'Residential',
    ];
  } else if (userRole === 'admin') {
    return ['Administration'];
  } else if (userRole === 'manager' && userDepartment) {
    return [userDepartment];
  }

  return [];
}
