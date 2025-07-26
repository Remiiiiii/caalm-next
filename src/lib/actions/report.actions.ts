'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
// import { generateAIAnalysis } from '@/lib/ai/gemini';

export interface GenerateReportData {
  userId: string;
  userRole: string;
  department: string;
  userName: string;
}

export interface ReportData {
  id: string;
  title: string;
  department: string;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
  content?: string;
  metrics?: {
    contracts: number;
    users: number;
    events: number;
    files: number;
  };
}

/**
 * Generate a comprehensive report using AI
 */
export async function generateReport(
  data: GenerateReportData
): Promise<ReportData> {
  try {
    // Fetch metrics based on department and role
    const metrics = await getMetricsForDepartment(
      data.department,
      data.userRole
    );

    // Generate AI analysis
    const aiContent = await generateMockAIAnalysis({
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
      id: reportId,
      title: reportTitle,
      department: data.department,
      generatedAt: new Date().toISOString(),
      status: 'completed' as const,
      content: aiContent,
      metrics,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
    };

    // Store report in database (if you have a reports collection)
    // await adminClient.databases.createDocument(
    //   appwriteConfig.databaseId,
    //   'reports', // You'll need to create this collection
    //   reportId,
    //   reportData
    // );

    return reportData;
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error('Failed to generate report');
  }
}

/**
 * Get metrics for a specific department
 */
async function getMetricsForDepartment(department: string, userRole: string) {
  const adminClient = await createAdminClient();

  try {
    // Fetch contracts count
    const contractsQuery = [Query.limit(1)];
    if (department !== 'all') {
      contractsQuery.push(Query.equal('department', department));
    }

    const contractsResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId || 'contracts',
      contractsQuery
    );

    // Fetch users count
    const usersQuery = [Query.limit(1)];
    if (department !== 'all' && userRole !== 'executive') {
      usersQuery.push(Query.equal('department', department));
    }

    const usersResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId || 'users',
      usersQuery
    );

    // Fetch events count
    const eventsQuery = [Query.limit(1)];
    if (department !== 'all') {
      eventsQuery.push(Query.equal('department', department));
    }

    const eventsResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId || 'calendar',
      eventsQuery
    );

    // Fetch files count
    const filesQuery = [Query.limit(1)];
    if (department !== 'all') {
      filesQuery.push(Query.equal('department', department));
    }

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
 * Mock AI analysis function (replace with actual AI integration)
 */
async function generateMockAIAnalysis(data: {
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
