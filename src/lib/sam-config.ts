// SAM.gov API Configuration and Types - Official API Specification
export const SAM_CONFIG = {
  // Official SAM.gov API endpoints
  BASE_URL: 'https://api-alpha.sam.gov/opportunities/v2/search',
  PROD_BASE_URL: 'https://api.sam.gov/opportunities/v2/search',
  RATE_LIMIT: 1000, // requests per day (varies by role)
  MAX_RESULTS_PER_PAGE: 1000, // Max Value = 1000 per API docs
  DEFAULT_RESULTS_PER_PAGE: 100, // Increased for better UX
  MAX_DATE_RANGE_YEARS: 1, // Date range must be 1 year(s) apart
};

// Official Procurement Types from SAM.gov API
export const PROCUREMENT_TYPES = {
  u: 'Justification (J&A)',
  p: 'Pre solicitation',
  a: 'Award Notice',
  r: 'Sources Sought',
  s: 'Special Notice',
  o: 'Solicitation',
  g: 'Sale of Surplus Property',
  k: 'Combined Synopsis/Solicitation',
  i: 'Intent to Bundle Requirements (DoD-Funded)',
} as const;

// Legacy notice types for backward compatibility
export const NOTICE_TYPES = PROCUREMENT_TYPES;

// Official Set-Aside Codes from SAM.gov API
export const SET_ASIDE_CODES = {
  SBA: 'Total Small Business Set-Aside (FAR 19.5)',
  SBP: 'Partial Small Business Set-Aside (FAR 19.5)',
  '8A': '8(a) Set-Aside (FAR 19.8)',
  '8AN': '8(a) Sole Source (FAR 19.8)',
  HZC: 'Historically Underutilized Business (HUBZone) Set-Aside (FAR 19.13)',
  HZS: 'Historically Underutilized Business (HUBZone) Sole Source (FAR 19.13)',
  SDVOSBC:
    'Service-Disabled Veteran-Owned Small Business (SDVOSB) Set-Aside (FAR 19.14)',
  SDVOSBS:
    'Service-Disabled Veteran-Owned Small Business (SDVOSB) Sole Source (FAR 19.14)',
  WOSB: 'Women-Owned Small Business (WOSB) Program Set-Aside (FAR 19.15)',
  WOSBSS: 'Women-Owned Small Business (WOSB) Program Sole Source (FAR 19.15)',
  EDWOSB:
    'Economically Disadvantaged WOSB (EDWOSB) Program Set-Aside (FAR 19.15)',
  EDWOSBSS:
    'Economically Disadvantaged WOSB (EDWOSB) Program Sole Source (FAR 19.15)',
} as const;

// Legacy set-aside types for backward compatibility
export const SET_ASIDE_TYPES = {
  SBA: 'Small Business Set-Aside',
  '8A': '8(a) Business Development',
  HUBZone: 'HUBZone Set-Aside',
  SDVOSB: 'Service-Disabled Veteran-Owned Small Business',
  WOSB: 'Women-Owned Small Business',
  EDWOSB: 'Economically Disadvantaged Women-Owned Small Business',
  VSB: 'Veteran-Owned Small Business',
} as const;

// Enhanced Search Parameters Interface - Official SAM.gov API v2
export interface SAMContractSearchParams {
  // Required parameters
  api_key: string;
  postedFrom: string; // MM/dd/yyyy format (mandatory)
  postedTo: string; // MM/dd/yyyy format (mandatory, max 1 year range)

  // Pagination
  limit?: number; // Max 1000, default 1
  offset?: number; // Default 0

  // Core search filters
  title?: string; // Title search
  keyword?: string; // Legacy support
  ptype?: keyof typeof PROCUREMENT_TYPES; // Procurement type
  noticeType?: keyof typeof NOTICE_TYPES; // Legacy support
  solnum?: string; // Solicitation number
  noticeid?: string; // Notice ID

  // Classification and set-aside
  ncode?: string; // NAICS code
  naicsCode?: string; // Legacy support
  ccode?: string; // Classification code
  typeOfSetAside?: keyof typeof SET_ASIDE_CODES;
  setAside?: keyof typeof SET_ASIDE_TYPES; // Legacy support
  typeOfSetAsideDescription?: string;

  // Location filters
  state?: string; // Place of performance state
  zip?: string; // Place of performance zip

  // Organization filters
  organizationCode?: string; // Code of associated organization
  organizationName?: string; // Name of associated organization (supports general search)
  deptname?: string; // Department Name (L1) - Deprecated in v2
  subtier?: string; // Agency Name (L2) - Deprecated in v2
  dept?: string; // Legacy support

  // Date ranges
  rdlfrom?: string; // Response deadline from (MM/dd/yyyy)
  rdlto?: string; // Response deadline to (MM/dd/yyyy, max 1 year range)

  // Status (coming soon per API docs)
  status?: 'active' | 'inactive' | 'archived' | 'cancelled' | 'deleted';
}

// Enhanced Contract Response Interface - Official SAM.gov API v2
export interface SAMContract {
  // Core identification
  noticeId: string;
  title: string;
  solicitationNumber?: string;

  // Organization hierarchy
  fullParentPathName?: string; // Complete organization path
  fullParentPathCode?: string; // Organization code path
  department?: string; // Legacy support
  subTier?: string; // Legacy support
  office?: string; // Legacy support

  // Dates and status
  postedDate: string;
  type: string;
  baseType?: string;
  archiveType?: string;
  archiveDate?: string;
  responseDeadLine?: string;
  active?: string; // "Yes" or "No" from API

  // Classification and set-aside
  naicsCode?: string;
  naicsDescription?: string; // Keep existing field
  classificationCode?: string;
  typeOfSetAsideDescription?: string;
  typeOfSetAside?: string;

  // Award information
  award?: {
    date?: string;
    number?: string;
    amount?: string;
    awardee?: {
      name?: string;
      location?: {
        streetAddress?: string;
        city?: {
          code?: string;
          name?: string;
        };
        state?: {
          code?: string;
          name?: string;
        };
        zip?: string;
        country?: {
          code?: string;
          name?: string;
        };
      };
    };
  };

  // Content and links
  description?: string;
  additionalInfoLink?: string;
  uiLink?: string;
  resourceLinks?: Array<{
    rel?: string;
    href?: string;
    title?: string;
    type?: string;
  }>;

  // Organization details
  organizationType?: string;
  officeAddress?: {
    zipcode?: string;
    city?: string;
    countryCode?: string;
    state?: string;
  };

  // Place of performance
  placeOfPerformance?: {
    streetAddress?: string;
    city?: {
      code?: string;
      name?: string;
    };
    state?: {
      code?: string;
      name?: string;
    };
    zip?: string;
    country?: {
      code?: string;
      name?: string;
    };
  };

  // Contact information
  pointOfContact?: Array<{
    fax?: string;
    type?: string;
    email?: string;
    phone?: string;
    title?: string;
    fullName?: string;
    additionalInfo?: {
      content?: string;
    };
  }>;

  // API links
  links?: Array<{
    rel?: string;
    href?: string;
    hreflang?: string;
    media?: string;
    title?: string;
    type?: string;
    deprecation?: string;
  }>;
}

// API Response Interface
export interface SAMSearchResponse {
  totalRecords: number;
  page: number;
  size: number;
  opportunities: SAMContract[];
  links?: Array<{
    rel?: string;
    href?: string;
  }>;
}

// Utility Functions
export const validateSAMApiKey = (apiKey: string): boolean => {
  return Boolean(apiKey && apiKey.length > 0);
};

export const formatContractAmount = (amount?: string): string => {
  if (!amount) return 'Not specified';

  const numAmount = parseFloat(amount.replace(/[,$]/g, ''));
  if (isNaN(numAmount)) return amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

export const formatContractDate = (dateString?: string): string => {
  if (!dateString) return 'Not specified';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const getContractTypeDisplay = (type: string): string => {
  return NOTICE_TYPES[type as keyof typeof NOTICE_TYPES] || type;
};

export const getSetAsideDisplay = (setAside?: string): string => {
  if (!setAside) return 'None';
  return SET_ASIDE_TYPES[setAside as keyof typeof SET_ASIDE_TYPES] || setAside;
};

// Response Deadline Options for UI
export const RESPONSE_DEADLINE_OPTIONS = {
  Anytime: null,
  'Next Day': 1,
  'Next 2 Days': 2,
  'Next 3 Days': 3,
  'Next Week': 7,
  'Next Month': 30,
  'Next 3 Months': 90,
  'Next Year': 365,
} as const;

// Helper functions for SAM.gov API integration
export const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString('en-US');
};

export const addMonths = (date: Date, months: number): string => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toLocaleDateString('en-US');
};

export const getDefaultFromDate = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3); // 3 months ago
  return date.toLocaleDateString('en-US');
};

export const getDefaultToDate = (): string => {
  return new Date().toLocaleDateString('en-US');
};

// Map Response/Date Offers Due options to API format
export const mapResponseDeadline = (
  responseOption: keyof typeof RESPONSE_DEADLINE_OPTIONS
): string | null => {
  const today = new Date();
  const days = RESPONSE_DEADLINE_OPTIONS[responseOption];

  if (days === null) return null;
  return addDays(today, days);
};

// Validate date range for SAM.gov API (max 1 year)
export const validateDateRange = (
  fromDate: string,
  toDate: string
): boolean => {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 365; // Max 1 year range per API docs
  } catch {
    return false;
  }
};

// Format location for display
export const formatLocation = (
  location?: SAMContract['placeOfPerformance']
): string => {
  if (!location) return 'Not specified';

  const parts: string[] = [];
  if (location.city?.name) parts.push(location.city.name);
  if (location.state?.name) parts.push(location.state.name);
  if (location.zip) parts.push(location.zip);

  return parts.length > 0 ? parts.join(', ') : 'Not specified';
};

// Format contact information for display
export const formatContact = (
  contacts?: SAMContract['pointOfContact']
): string => {
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return 'No contact information';
  }

  const primary = contacts.find((c) => c.type === 'primary') || contacts[0];
  const parts: string[] = [];

  if (primary.fullName) parts.push(primary.fullName);
  if (primary.email) parts.push(primary.email);
  if (primary.phone) parts.push(primary.phone);

  return parts.length > 0 ? parts.join(' • ') : 'No contact information';
};
