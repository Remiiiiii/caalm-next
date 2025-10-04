import { NextRequest, NextResponse } from 'next/server';
import { createSAMApiService } from '@/lib/sam-api';
import {
  SAMContractSearchParams,
  validateDateRange,
  getDefaultFromDate,
  getDefaultToDate,
} from '@/lib/sam-config';

/**
 * Secure API route for SAM.gov Opportunities search
 * Protects the API key on server-side and provides clean interface to client
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const searchFilters = await request.json();

    // Validate required parameters
    if (!searchFilters) {
      return NextResponse.json(
        { success: false, error: 'Search parameters are required' },
        { status: 400 }
      );
    }

    // Create SAM API service with server-side API key
    let samService;
    try {
      samService = createSAMApiService();
    } catch (error) {
      console.error('SAM API Service creation failed:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            'SAM.gov API key not configured. Please set the GOV_API_KEY environment variable.',
          setup: {
            message: 'To get your SAM.gov API key:',
            steps: [
              '1. Go to https://sam.gov/',
              '2. Sign in to your account',
              '3. Navigate to Account Details page',
              '4. Request an API Key (40 characters)',
              '5. Set GOV_API_KEY environment variable',
            ],
          },
        },
        { status: 500 }
      );
    }

    // Build search parameters with proper validation
    const searchParams: Omit<SAMContractSearchParams, 'api_key'> = {
      limit: searchFilters.limit || 100,
      offset: searchFilters.offset || 0,
      postedFrom: searchFilters.postedFrom || getDefaultFromDate(),
      postedTo: searchFilters.postedTo || getDefaultToDate(),
    };

    // Validate date range (SAM.gov API requires max 1 year)
    if (!validateDateRange(searchParams.postedFrom, searchParams.postedTo)) {
      return NextResponse.json(
        { success: false, error: 'Date range must be 1 year or less' },
        { status: 400 }
      );
    }

    // Core search filters
    if (searchFilters.title) searchParams.title = searchFilters.title;
    if (searchFilters.keyword) searchParams.title = searchFilters.keyword;
    if (searchFilters.solnum) searchParams.solnum = searchFilters.solnum;
    if (searchFilters.noticeid) searchParams.noticeid = searchFilters.noticeid;

    // Procurement type
    if (searchFilters.procurementType) {
      searchParams.ptype = searchFilters.procurementType;
    }

    // NAICS handling
    if (searchFilters.naicsCodes && searchFilters.naicsCodes.length > 0) {
      searchParams.ncode = searchFilters.naicsCodes[0];
    } else if (searchFilters.naicsCode) {
      searchParams.ncode = searchFilters.naicsCode;
    }

    if (searchFilters.ccode) searchParams.ccode = searchFilters.ccode;

    // Set-aside handling
    if (searchFilters.setAsideType) {
      searchParams.typeOfSetAside = searchFilters.setAsideType;
    }
    if (searchFilters.setAsideDescription) {
      searchParams.typeOfSetAsideDescription =
        searchFilters.setAsideDescription;
    }

    // Location filters
    if (searchFilters.state) searchParams.state = searchFilters.state;
    if (searchFilters.zip) searchParams.zip = searchFilters.zip;

    // Organization filters
    if (searchFilters.organizationName) {
      searchParams.organizationName = searchFilters.organizationName;
    }
    if (searchFilters.organizationCode) {
      searchParams.organizationCode = searchFilters.organizationCode;
    }

    // Response deadline handling
    if (
      searchFilters.responseDeadlineOption &&
      searchFilters.responseDeadlineOption !== 'Anytime'
    ) {
      // Handle response deadline mapping on server side
      const deadlineDate = mapResponseDeadlineServer({
        responseOption: searchFilters.responseDeadlineOption,
      });
      if (deadlineDate) {
        searchParams.rdlfrom = getDefaultFromDate();
        searchParams.rdlto = deadlineDate;
      }
    }

    // Status filter
    if (searchFilters.status) searchParams.status = searchFilters.status;

    // Execute search through SAM API service
    const result = await samService.searchContracts(searchParams);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('SAM Opportunities API Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to search SAM.gov opportunities';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Server-side response deadline mapping
 */
function mapResponseDeadlineServer({
  responseOption,
}: {
  responseOption: string;
}): string | null {
  const today = new Date();

  const options: Record<string, () => string> = {
    'Next Day': () => addDays({ date: today, days: 1 }),
    'Next 2 Days': () => addDays({ date: today, days: 2 }),
    'Next 3 Days': () => addDays({ date: today, days: 3 }),
    'Next Week': () => addDays({ date: today, days: 7 }),
    'Next Month': () => addMonths({ date: today, months: 1 }),
    'Next 3 Months': () => addMonths({ date: today, months: 3 }),
    'Next Year': () => addMonths({ date: today, months: 12 }),
  };

  const mapper = options[responseOption];
  return mapper ? mapper() : null;
}

function addDays({ date, days }: { date: Date; days: number }): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString('en-US');
}

function addMonths({ date, months }: { date: Date; months: number }): string {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toLocaleDateString('en-US');
}

/**
 * Handle GET requests for API documentation
 */
export async function GET() {
  return NextResponse.json({
    message: 'SAM.gov Opportunities API',
    description:
      'POST to this endpoint with search parameters to query SAM.gov opportunities',
    documentation: 'https://open.gsa.gov/api/get-opportunities-public-api/',
    example: {
      method: 'POST',
      body: {
        keyword: 'IT Services',
        limit: 25,
        state: 'VA',
        procurementType: 'o',
        responseDeadlineOption: 'Next Month',
      },
    },
  });
}
