import { NextRequest, NextResponse } from 'next/server';
import { createSAMApiService } from '@/lib/sam-api';
import {
  SAMContractSearchParams,
  NOTICE_TYPES,
  SET_ASIDE_TYPES,
} from '@/lib/sam-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract search parameters
    const params: Omit<SAMContractSearchParams, 'api_key'> = {
      keyword: searchParams.get('keyword') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 25,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
      noticeType:
        (searchParams.get('noticeType') as keyof typeof NOTICE_TYPES) ||
        undefined,
      setAside:
        (searchParams.get('setAside') as keyof typeof SET_ASIDE_TYPES) ||
        undefined,
      naicsCode: searchParams.get('naicsCode') || undefined,
      postedFrom: searchParams.get('postedFrom') || undefined,
      postedTo: searchParams.get('postedTo') || undefined,
      state: searchParams.get('state') || undefined,
      dept: searchParams.get('dept') || undefined,
    };

    // Create SAM API service instance
    const samService = createSAMApiService();

    // Search for contracts
    const results = await samService.searchContracts(params);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Contracts API error:', error);

    // Check if it's an API key error
    if (
      error instanceof Error &&
      error.message.includes('SAM.gov API key is required')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SAM.gov API key not configured. Please check your environment variables.',
          errorCode: 'API_KEY_MISSING',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch contracts',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract search parameters from POST body
    const params: Omit<SAMContractSearchParams, 'api_key'> = {
      keyword: body.keyword,
      limit: body.limit || 25,
      offset: body.offset || 0,
      noticeType: body.noticeType,
      setAside: body.setAside,
      naicsCode: body.naicsCode,
      postedFrom: body.postedFrom,
      postedTo: body.postedTo,
      state: body.state,
      dept: body.dept,
    };

    // Create SAM API service instance
    const samService = createSAMApiService();

    // Search for contracts
    const results = await samService.searchContracts(params);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Contracts API error:', error);

    // Check if it's an API key error
    if (
      error instanceof Error &&
      error.message.includes('SAM.gov API key is required')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SAM.gov API key not configured. Please check your environment variables.',
          errorCode: 'API_KEY_MISSING',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch contracts',
      },
      { status: 500 }
    );
  }
}
