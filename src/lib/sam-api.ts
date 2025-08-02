// SAM.gov API Service
import {
  SAM_CONFIG,
  SAMContractSearchParams,
  SAMContract,
  SAMSearchResponse,
  validateSAMApiKey,
} from './sam-config';
import { appwriteConfig } from './appwrite/config';

export class SAMApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, useProduction = true) {
    if (!validateSAMApiKey(apiKey)) {
      throw new Error('Invalid SAM.gov API key provided');
    }

    this.apiKey = apiKey;
    this.baseUrl = useProduction
      ? SAM_CONFIG.PROD_BASE_URL
      : SAM_CONFIG.BASE_URL;
  }

  /**
   * Search for contract opportunities
   */
  async searchContracts(
    params: Omit<SAMContractSearchParams, 'api_key'>
  ): Promise<SAMSearchResponse> {
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      limit: (params.limit || SAM_CONFIG.DEFAULT_RESULTS_PER_PAGE).toString(),
      offset: (params.offset || 0).toString(),
    });

    // Add required date parameters (SAM.gov API requires these)
    const defaultFromDate = params.postedFrom || this.getDefaultFromDate();
    const defaultToDate = params.postedTo || this.getDefaultToDate();

    searchParams.append('postedFrom', defaultFromDate);
    searchParams.append('postedTo', defaultToDate);

    // Add optional parameters
    if (params.keyword) searchParams.append('keyword', params.keyword);
    if (params.noticeType) searchParams.append('ptype', params.noticeType);
    if (params.setAside) searchParams.append('typeOfSetAside', params.setAside);
    if (params.naicsCode) searchParams.append('ncode', params.naicsCode);
    if (params.state) searchParams.append('state', params.state);
    if (params.dept) searchParams.append('organizationName', params.dept);

    const url = `${this.baseUrl}/search?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CAALM-Application/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Transform the response to match our interface
      return {
        totalRecords: data.totalRecords || 0,
        page:
          Math.floor(
            (params.offset || 0) /
              (params.limit || SAM_CONFIG.DEFAULT_RESULTS_PER_PAGE)
          ) + 1,
        size: params.limit || SAM_CONFIG.DEFAULT_RESULTS_PER_PAGE,
        opportunities: data.opportunitiesData || data.data || [],
        links: data.links || [],
      };
    } catch (error) {
      console.error('SAM.gov API search error:', error);
      throw new Error(
        `Failed to search contracts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get contract details by opportunity ID
   */
  async getContractDetails(opportunityId: string): Promise<SAMContract | null> {
    const url = `${this.baseUrl}/opportunities/${opportunityId}?api_key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CAALM-Application/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('SAM.gov API details error:', error);
      throw new Error(
        `Failed to get contract details: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get default "from" date (30 days ago in MM/dd/yyyy format for testing)
   */
  private getDefaultFromDate(): string {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.formatDateForSAM(thirtyDaysAgo);
  }

  /**
   * Get default "to" date (today in MM/dd/yyyy format)
   */
  private getDefaultToDate(): string {
    return this.formatDateForSAM(new Date());
  }

  /**
   * Format date for SAM.gov API (MM/dd/yyyy format)
   */
  private formatDateForSAM(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Search for entities (vendors/contractors)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async searchEntities(_params: {
    keyword?: string;
    ueiSAM?: string;
    entityStructure?: string;
    registrationStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ totalRecords: number; entities: Array<unknown> }> {
    // Note: This would use the Entity Management API endpoint
    // For now, returning a placeholder as the focus is on opportunities
    console.warn('Entity search not yet implemented');
    return {
      totalRecords: 0,
      entities: [],
    };
  }

  /**
   * Test API connection and key validity
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.searchContracts({ limit: 1 });
      return {
        success: true,
        message: `Connected successfully. Found ${result.totalRecords} total opportunities.`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get API usage statistics (if available)
   */
  async getUsageStats(): Promise<{ remaining: number; total: number } | null> {
    // This would require additional API endpoints that provide usage info
    // For now, return null as this info might not be available
    return null;
  }

  /**
   * Get debug information about the API key
   */
  async getDebugInfo(): Promise<{ keyLength: string; keyPrefix: string }> {
    return {
      keyLength: this.apiKey ? this.apiKey.length.toString() : '0',
      keyPrefix: this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'No key',
    };
  }
}

/**
 * Factory function to create SAM API service instance
 */
export const createSAMApiService = (
  apiKey?: string,
  useProduction = true
): SAMApiService => {
  const key = apiKey || appwriteConfig.govApiKey;

  if (!key) {
    throw new Error(
      'SAM.gov API key is required. Please get an API key from your SAM.gov profile and set GOV_API_KEY environment variable.'
    );
  }

  return new SAMApiService(key, useProduction);
};

/**
 * Default export for convenience
 */
export default SAMApiService;
