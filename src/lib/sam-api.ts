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
   * Search for contract opportunities using comprehensive SAM.gov API v2 parameters
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

    // Core search filters
    if (params.title) searchParams.append('title', params.title);
    if (params.keyword) searchParams.append('title', params.keyword); // Map keyword to title for broader search
    if (params.solnum) searchParams.append('solnum', params.solnum);
    if (params.noticeid) searchParams.append('noticeid', params.noticeid);

    // Procurement type handling (support both new and legacy)
    if (params.ptype) searchParams.append('ptype', params.ptype);
    if (params.noticeType) searchParams.append('ptype', params.noticeType);

    // Classification and set-aside (support both new and legacy)
    if (params.ncode) searchParams.append('ncode', params.ncode);
    if (params.naicsCode) searchParams.append('ncode', params.naicsCode);
    if (params.ccode) searchParams.append('ccode', params.ccode);
    if (params.typeOfSetAside)
      searchParams.append('typeOfSetAside', params.typeOfSetAside);
    if (params.setAside) searchParams.append('typeOfSetAside', params.setAside);
    if (params.typeOfSetAsideDescription)
      searchParams.append(
        'typeOfSetAsideDescription',
        params.typeOfSetAsideDescription
      );

    // Location filters
    if (params.state) searchParams.append('state', params.state);
    if (params.zip) searchParams.append('zip', params.zip);

    // Organization filters (support both new and legacy)
    if (params.organizationCode)
      searchParams.append('organizationCode', params.organizationCode);
    if (params.organizationName)
      searchParams.append('organizationName', params.organizationName);
    if (params.deptname) searchParams.append('deptname', params.deptname); // Deprecated but still supported
    if (params.subtier) searchParams.append('subtier', params.subtier); // Deprecated but still supported
    if (params.dept) searchParams.append('organizationName', params.dept); // Legacy support

    // Response deadline range
    if (params.rdlfrom && params.rdlto) {
      searchParams.append('rdlfrom', params.rdlfrom);
      searchParams.append('rdlto', params.rdlto);
    }

    // Status filter (coming soon per API docs)
    if (params.status) searchParams.append('status', params.status);

    const url = `${this.baseUrl}?${searchParams.toString()}`;

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

      // Transform the response to match our enhanced interface
      return this.transformSearchResponse(data, params);
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
   * Get detailed information about a specific contract opportunity
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
      const result = await this.searchContracts({
        limit: 1,
        postedFrom: this.getDefaultFromDate(),
        postedTo: this.getDefaultToDate(),
      });
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
    // Note: SAM.gov API doesn't provide usage stats in the response headers
    // This would need to be implemented based on actual API documentation
    console.warn('Usage stats not available from SAM.gov API');
    return null;
  }

  /**
   * Transform SAM.gov API response to match our application data structure
   */
  private transformSearchResponse(
    data: unknown,
    params: Omit<SAMContractSearchParams, 'api_key'>
  ): SAMSearchResponse {
    const apiResponse = data as {
      totalRecords?: number;
      offset?: number;
      limit?: number;
      opportunitiesData?: unknown[];
      data?: unknown[];
      links?: unknown[];
    };

    return {
      totalRecords: apiResponse.totalRecords || 0,
      page:
        Math.floor(
          (params.offset || 0) /
            (params.limit || SAM_CONFIG.DEFAULT_RESULTS_PER_PAGE)
        ) + 1,
      size: params.limit || SAM_CONFIG.DEFAULT_RESULTS_PER_PAGE,
      opportunities: (
        apiResponse.opportunitiesData ||
        apiResponse.data ||
        []
      ).map((opp: unknown) => this.transformOpportunity(opp)),
      links: (apiResponse.links || []) as SAMSearchResponse['links'],
    };
  }

  /**
   * Transform individual opportunity data to match SAMContract interface
   */
  private transformOpportunity(opp: unknown): SAMContract {
    const opportunity = opp as Record<string, unknown>;

    return {
      // Core identification
      noticeId: String(opportunity.noticeId || ''),
      title: String(opportunity.title || ''),
      solicitationNumber: opportunity.solicitationNumber
        ? String(opportunity.solicitationNumber)
        : undefined,

      // Organization hierarchy
      fullParentPathName: opportunity.fullParentPathName
        ? String(opportunity.fullParentPathName)
        : undefined,
      fullParentPathCode: opportunity.fullParentPathCode
        ? String(opportunity.fullParentPathCode)
        : undefined,
      department: opportunity.department
        ? String(opportunity.department)
        : undefined,
      subTier: opportunity.subTier ? String(opportunity.subTier) : undefined,
      office: opportunity.office ? String(opportunity.office) : undefined,

      // Dates and status
      postedDate: String(opportunity.postedDate || ''),
      type: String(opportunity.type || ''),
      baseType: opportunity.baseType ? String(opportunity.baseType) : undefined,
      archiveType: opportunity.archiveType
        ? String(opportunity.archiveType)
        : undefined,
      archiveDate: opportunity.archiveDate
        ? String(opportunity.archiveDate)
        : undefined,
      responseDeadLine: opportunity.responseDeadLine
        ? String(opportunity.responseDeadLine)
        : undefined,
      active: opportunity.active ? String(opportunity.active) : undefined,

      // Classification and set-aside
      naicsCode: opportunity.naicsCode
        ? String(opportunity.naicsCode)
        : undefined,
      classificationCode: opportunity.classificationCode
        ? String(opportunity.classificationCode)
        : undefined,
      typeOfSetAsideDescription: opportunity.typeOfSetAsideDescription
        ? String(opportunity.typeOfSetAsideDescription)
        : undefined,
      typeOfSetAside: opportunity.typeOfSetAside
        ? String(opportunity.typeOfSetAside)
        : undefined,

      // Award information
      award: opportunity.award
        ? this.transformAward(opportunity.award)
        : undefined,

      // Content and links
      description: opportunity.description
        ? String(opportunity.description)
        : undefined,
      additionalInfoLink: opportunity.additionalInfoLink
        ? String(opportunity.additionalInfoLink)
        : undefined,
      uiLink: opportunity.uiLink ? String(opportunity.uiLink) : undefined,
      resourceLinks: opportunity.resourceLinks
        ? this.transformResourceLinks(opportunity.resourceLinks)
        : undefined,

      // Organization details
      organizationType: opportunity.organizationType
        ? String(opportunity.organizationType)
        : undefined,
      officeAddress: opportunity.officeAddress
        ? this.transformOfficeAddress(opportunity.officeAddress)
        : undefined,

      // Place of performance
      placeOfPerformance: opportunity.placeOfPerformance
        ? this.transformPlaceOfPerformance(opportunity.placeOfPerformance)
        : undefined,

      // Contact information
      pointOfContact: opportunity.pointOfContact
        ? this.transformPointOfContact(opportunity.pointOfContact)
        : undefined,

      // API links
      links: opportunity.links
        ? this.transformLinks(opportunity.links)
        : undefined,
    };
  }

  private transformAward(award: unknown): SAMContract['award'] {
    const awardData = award as Record<string, unknown>;
    return {
      date: awardData.date ? String(awardData.date) : undefined,
      number: awardData.number ? String(awardData.number) : undefined,
      amount: awardData.amount ? String(awardData.amount) : undefined,
      awardee: awardData.awardee
        ? this.transformAwardee(awardData.awardee)
        : undefined,
    };
  }

  private transformAwardee(
    awardee: unknown
  ): NonNullable<SAMContract['award']>['awardee'] {
    const awardeeData = awardee as Record<string, unknown>;
    return {
      name: awardeeData.name ? String(awardeeData.name) : undefined,
      location: awardeeData.location
        ? this.transformPlaceOfPerformance(awardeeData.location)
        : undefined,
    };
  }

  private transformResourceLinks(links: unknown): SAMContract['resourceLinks'] {
    if (!Array.isArray(links)) return undefined;
    return links.map((link: unknown) => {
      const linkData = link as Record<string, unknown>;
      return {
        rel: linkData.rel ? String(linkData.rel) : undefined,
        href: linkData.href ? String(linkData.href) : undefined,
        title: linkData.title ? String(linkData.title) : undefined,
        type: linkData.type ? String(linkData.type) : undefined,
      };
    });
  }

  private transformOfficeAddress(
    address: unknown
  ): SAMContract['officeAddress'] {
    const addressData = address as Record<string, unknown>;
    return {
      zipcode: addressData.zipcode ? String(addressData.zipcode) : undefined,
      city: addressData.city ? String(addressData.city) : undefined,
      countryCode: addressData.countryCode
        ? String(addressData.countryCode)
        : undefined,
      state: addressData.state ? String(addressData.state) : undefined,
    };
  }

  private transformPlaceOfPerformance(
    place: unknown
  ): SAMContract['placeOfPerformance'] {
    const placeData = place as Record<string, unknown>;
    return {
      streetAddress: placeData.streetAddress
        ? String(placeData.streetAddress)
        : undefined,
      city: placeData.city
        ? this.transformNameCodePair(placeData.city)
        : undefined,
      state: placeData.state
        ? this.transformNameCodePair(placeData.state)
        : undefined,
      zip: placeData.zip ? String(placeData.zip) : undefined,
      country: placeData.country
        ? this.transformNameCodePair(placeData.country)
        : undefined,
    };
  }

  private transformNameCodePair(
    pair: unknown
  ): { code?: string; name?: string } | undefined {
    if (!pair || typeof pair !== 'object') return undefined;
    const pairData = pair as Record<string, unknown>;
    return {
      code: pairData.code ? String(pairData.code) : undefined,
      name: pairData.name ? String(pairData.name) : undefined,
    };
  }

  private transformPointOfContact(
    contacts: unknown
  ): SAMContract['pointOfContact'] {
    if (!Array.isArray(contacts)) return undefined;
    return contacts.map((contact: unknown) => {
      const contactData = contact as Record<string, unknown>;
      return {
        fax: contactData.fax ? String(contactData.fax) : undefined,
        type: contactData.type ? String(contactData.type) : undefined,
        email: contactData.email ? String(contactData.email) : undefined,
        phone: contactData.phone ? String(contactData.phone) : undefined,
        title: contactData.title ? String(contactData.title) : undefined,
        fullName: contactData.fullName
          ? String(contactData.fullName)
          : undefined,
        additionalInfo: contactData.additionalInfo
          ? {
              content: String(
                (contactData.additionalInfo as Record<string, unknown>)
                  .content || ''
              ),
            }
          : undefined,
      };
    });
  }

  private transformLinks(links: unknown): SAMContract['links'] {
    if (!Array.isArray(links)) return undefined;
    return links.map((link: unknown) => {
      const linkData = link as Record<string, unknown>;
      return {
        rel: linkData.rel ? String(linkData.rel) : undefined,
        href: linkData.href ? String(linkData.href) : undefined,
        hreflang: linkData.hreflang ? String(linkData.hreflang) : undefined,
        media: linkData.media ? String(linkData.media) : undefined,
        title: linkData.title ? String(linkData.title) : undefined,
        type: linkData.type ? String(linkData.type) : undefined,
        deprecation: linkData.deprecation
          ? String(linkData.deprecation)
          : undefined,
      };
    });
  }

  /**
   * Get debug information about the API key
   */
  async getDebugInfo(): Promise<{ keyLength: string; keyPrefix: string }> {
    return {
      keyLength: this.apiKey.length.toString(),
      keyPrefix: this.apiKey.substring(0, 4) + '...',
    };
  }
}

/**
 * Factory function to create a SAMApiService instance
 */
export const createSAMApiService = (
  apiKey?: string,
  useProduction = true
): SAMApiService => {
  const key = apiKey || appwriteConfig.govApiKey;
  if (!key) {
    throw new Error('SAM.gov API key is required');
  }
  return new SAMApiService(key, useProduction);
};
