// SAM.gov API Configuration and Types
export const SAM_CONFIG = {
  // Use alpha endpoints for testing, production for live
  BASE_URL: 'https://api-alpha.sam.gov/opportunities/v2',
  PROD_BASE_URL: 'https://api.sam.gov/opportunities/v2',
  RATE_LIMIT: 1000, // requests per hour
  MAX_RESULTS_PER_PAGE: 1000, // Updated to match API docs
  DEFAULT_RESULTS_PER_PAGE: 25,
};

// Notice Types from SAM.gov API
export const NOTICE_TYPES = {
  o: 'Solicitation',
  p: 'Presolicitation',
  k: 'Combined Synopsis/Solicitation',
  r: 'Sources Sought',
  g: 'Sale of Surplus Property',
  s: 'Special Notice',
  i: 'Consolidate/(Substantially) Bundle',
  a: 'Award Notice',
  u: 'Justification and Authorization',
} as const;

// Set-Aside Types
export const SET_ASIDE_TYPES = {
  SBA: 'Small Business Set-Aside',
  '8A': '8(a) Business Development',
  HUBZone: 'HUBZone Set-Aside',
  SDVOSB: 'Service-Disabled Veteran-Owned Small Business',
  WOSB: 'Women-Owned Small Business',
  EDWOSB: 'Economically Disadvantaged Women-Owned Small Business',
  VSB: 'Veteran-Owned Small Business',
} as const;

// Search Parameters Interface
export interface SAMContractSearchParams {
  keyword?: string;
  limit?: number;
  offset?: number;
  noticeType?: keyof typeof NOTICE_TYPES;
  setAside?: keyof typeof SET_ASIDE_TYPES;
  naicsCode?: string;
  postedFrom?: string; // MM/dd/yyyy format (required by SAM.gov API)
  postedTo?: string; // MM/dd/yyyy format (required by SAM.gov API)
  state?: string;
  dept?: string;
  api_key: string;
}

// Contract Response Interface
export interface SAMContract {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  department?: string;
  subTier?: string;
  office?: string;
  postedDate: string;
  responseDeadLine?: string;
  type: string;
  typeOfSetAside?: string;
  description?: string;
  naicsCode?: string;
  naicsDescription?: string;
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
  pointOfContact?: Array<{
    fax?: string;
    type?: string;
    email?: string;
    phone?: string;
    title?: string;
    fullName?: string;
  }>;
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
  additionalInfoLink?: string;
  uiLink?: string;
  links?: Array<{
    rel?: string;
    href?: string;
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
