import { NextRequest, NextResponse } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';

export interface SAMContractDetails {
  noticeId: string;
  title?: string;
  description?: string;
  fullDescription?: string;
  resourceLinks?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  attachments?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  additionalInfo?: {
    content: string;
    links?: Array<{
      title: string;
      url: string;
    }>;
  };
}

export interface SAMApiResponse {
  success: boolean;
  data?: SAMContractDetails;
  error?: string;
  fallback?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noticeId = searchParams.get('noticeId');

    if (!noticeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notice ID is required',
        },
        { status: 400 }
      );
    }

    if (!appwriteConfig.govApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'SAM.gov API key not configured',
        },
        { status: 500 }
      );
    }

    console.log(`Fetching contract details for notice ID: ${noticeId}`);

    // Make direct API call to SAM.gov
    const apiUrl = `https://api.sam.gov/prod/opportunities/v1/noticedesc?noticeid=${encodeURIComponent(
      noticeId
    )}&api_key=${encodeURIComponent(appwriteConfig.govApiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse the SAM.gov API response
      const contractDetails = parseSAMApiResponse(data, noticeId);

      return NextResponse.json({
        success: true,
        data: contractDetails,
        source: 'sam-api',
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('SAM.gov API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch from SAM.gov API: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        fallback: true,
      },
      { status: 200 }
    );
  }
}

function parseSAMApiResponse(
  apiData: any,
  noticeId: string
): SAMContractDetails {
  try {
    const contractDetails: SAMContractDetails = {
      noticeId,
      title: apiData.title || apiData.noticeTitle || '',
      description: apiData.description || apiData.noticeDescription || '',
      fullDescription: apiData.fullDescription || apiData.description || '',
      resourceLinks: [],
      attachments: [],
      additionalInfo: {
        content: '',
        links: [],
      },
    };

    // Parse resource links if available
    if (apiData.resourceLinks && Array.isArray(apiData.resourceLinks)) {
      contractDetails.resourceLinks = apiData.resourceLinks
        .filter((link: any) => link && (link.url || link.href))
        .map((link: any) => ({
          title: link.title || link.name || 'Resource Link',
          url: link.url || link.href || '#',
          type: link.type || link.category || 'document',
        }));
    }

    // Parse attachments if available
    if (apiData.attachments && Array.isArray(apiData.attachments)) {
      contractDetails.attachments = apiData.attachments
        .filter(
          (attachment: any) => attachment && (attachment.url || attachment.href)
        )
        .map((attachment: any) => ({
          title:
            attachment.title ||
            attachment.name ||
            attachment.filename ||
            'Attachment',
          url: attachment.url || attachment.href || '#',
          type: attachment.type || attachment.fileType || 'document',
        }));
    }

    // Parse additional information
    if (apiData.additionalInfo || apiData.otherInformation) {
      const additionalContent =
        apiData.additionalInfo || apiData.otherInformation;
      contractDetails.additionalInfo = {
        content:
          typeof additionalContent === 'string'
            ? additionalContent
            : JSON.stringify(additionalContent),
        links: [],
      };
    }

    return contractDetails;
  } catch (parseError) {
    console.error('Error parsing SAM.gov API response:', parseError);

    // Return basic fallback data
    return {
      noticeId,
      title: apiData.title || apiData.noticeTitle || '',
      description:
        apiData.description ||
        apiData.noticeDescription ||
        'No description available.',
      resourceLinks: [],
      attachments: [],
      additionalInfo: {
        content: '',
        links: [],
      },
    };
  }
}
