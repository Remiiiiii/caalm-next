// SAM.gov Contract Details API Service
// Fetches detailed contract information including descriptions and resource links

export interface SAMContractDetails {
  noticeId: string;
  title: string;
  description?: string;
  fullDescription?: string;
  resourceLinks?: Array<{
    rel?: string;
    href?: string;
    title?: string;
    type?: string;
    description?: string;
  }>;
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  additionalInfo?: {
    content?: string;
    links?: Array<{
      href: string;
      title?: string;
      type?: string;
    }>;
  };
}

export interface SAMApiResponse {
  success: boolean;
  data?: SAMContractDetails;
  error?: string;
  fallback?: boolean;
}

// SAM.gov API Configuration
const SAM_API_CONFIG = {
  BASE_URL: 'https://api.sam.gov/prod/opportunities/v1',
  DESCRIPTION_ENDPOINT: '/noticedesc',
  RATE_LIMIT: 1000,
  TIMEOUT: 10000, // 10 seconds
};

/**
 * Fetch detailed contract description from SAM.gov API
 * @param noticeId - The SAM.gov notice ID
 * @param apiKey - Optional SAM.gov API key (if available)
 * @returns Promise<SAMApiResponse>
 */
export async function fetchContractDetails(
  noticeId: string,
  apiKey?: string
): Promise<SAMApiResponse> {
  if (!noticeId) {
    return {
      success: false,
      error: 'Notice ID is required',
    };
  }

  try {
    console.log(`Fetching contract details for notice ID: ${noticeId}`);

    // Build the API URL
    const url = `${SAM_API_CONFIG.BASE_URL}${
      SAM_API_CONFIG.DESCRIPTION_ENDPOINT
    }?noticeid=${encodeURIComponent(noticeId)}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add API key if provided
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    // Make the API request
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(SAM_API_CONFIG.TIMEOUT),
    });

    if (!response.ok) {
      // Handle different error scenarios
      if (response.status === 401) {
        return {
          success: false,
          error: 'API authentication required. SAM.gov API key may be needed.',
          fallback: true,
        };
      } else if (response.status === 404) {
        return {
          success: false,
          error: 'Contract details not found',
          fallback: true,
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: 'API rate limit exceeded. Please try again later.',
          fallback: true,
        };
      } else {
        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`,
          fallback: true,
        };
      }
    }

    const data = await response.json();

    // Parse the SAM.gov response
    const contractDetails: SAMContractDetails = {
      noticeId: data.noticeId || noticeId,
      title: data.title || '',
      description: data.description || data.fullDescription || '',
      fullDescription: data.fullDescription || data.description || '',
      resourceLinks: parseResourceLinks(data.resourceLinks || data.links || []),
      attachments: parseAttachments(data.attachments || []),
      additionalInfo: {
        content: data.additionalInfo?.content || '',
        links: parseAdditionalLinks(data.additionalInfo?.links || []),
      },
    };

    console.log('Contract details fetched successfully:', {
      noticeId: contractDetails.noticeId,
      hasDescription: !!contractDetails.description,
      resourceLinksCount: contractDetails.resourceLinks?.length || 0,
      attachmentsCount: contractDetails.attachments?.length || 0,
    });

    return {
      success: true,
      data: contractDetails,
    };
  } catch (error) {
    console.error('Error fetching contract details:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please try again.',
          fallback: true,
        };
      } else if (error.message.includes('CORS')) {
        return {
          success: false,
          error: 'CORS error. SAM.gov API may require server-side requests.',
          fallback: true,
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fallback: true,
    };
  }
}

/**
 * Parse resource links from SAM.gov API response
 */
function parseResourceLinks(links: any[]): SAMContractDetails['resourceLinks'] {
  if (!Array.isArray(links)) return [];

  return links
    .filter((link) => link && link.href)
    .map((link) => ({
      rel: link.rel || 'related',
      href: link.href,
      title: link.title || link.description || 'Resource Link',
      type: link.type || 'application/octet-stream',
      description: link.description || link.title || '',
    }));
}

/**
 * Parse attachments from SAM.gov API response
 */
function parseAttachments(
  attachments: any[]
): SAMContractDetails['attachments'] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((attachment) => attachment && attachment.url)
    .map((attachment) => ({
      filename: attachment.filename || attachment.name || 'Attachment',
      url: attachment.url || attachment.href,
      size: attachment.size || attachment.fileSize,
      type:
        attachment.type || attachment.mimeType || 'application/octet-stream',
    }));
}

/**
 * Parse additional links from SAM.gov API response
 */
function parseAdditionalLinks(
  links: any[]
): Array<{ href: string; title?: string; type?: string }> {
  if (!Array.isArray(links)) return [];

  return links
    .filter((link) => link && link.href)
    .map((link) => ({
      href: link.href,
      title: link.title || link.description || 'Additional Link',
      type: link.type || 'text/html',
    }));
}

/**
 * Generate fallback contract details when API is not available
 */
export function generateFallbackContractDetails(
  noticeId: string,
  basicContract: any
): SAMContractDetails {
  return {
    noticeId,
    title: basicContract.title || 'Contract Details',
    description:
      basicContract.description || 'No detailed description available.',
    resourceLinks: basicContract.resourceLinks || [],
    attachments: [],
    additionalInfo: {
      content:
        'Detailed contract information is not available. Please visit SAM.gov for complete details.',
      links: [],
    },
  };
}

/**
 * Extract notice ID from various URL formats
 */
export function extractNoticeId(url: string): string | null {
  // Handle direct notice ID
  if (/^[a-f0-9]{32}$/i.test(url)) {
    return url;
  }

  // Handle SAM.gov URLs
  const patterns = [
    /noticeid=([a-f0-9]{32})/i,
    /notices\/([a-f0-9]{32})/i,
    /opportunities\/([a-f0-9]{32})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate SAM.gov API key format
 */
export function validateSAMApiKey(apiKey: string): boolean {
  // SAM.gov API keys are typically 32-64 character alphanumeric strings
  return /^[a-zA-Z0-9]{32,64}$/.test(apiKey);
}
