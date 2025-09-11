import { NextRequest, NextResponse } from 'next/server';
import { performQuickSearch } from '@/lib/actions/search.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchType = searchParams.get('type') as
      | 'all-contracts'
      | 'departments'
      | 'vendors'
      | 'active';
    const userId = searchParams.get('userId') || 'anonymous';
    const userRole = searchParams.get('userRole') || undefined;
    const userDepartment = searchParams.get('userDepartment') || undefined;
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!searchType) {
      return NextResponse.json(
        { error: 'Search type is required' },
        { status: 400 }
      );
    }

    const validSearchTypes = [
      'all-contracts',
      'departments',
      'vendors',
      'active',
    ];
    if (!validSearchTypes.includes(searchType)) {
      return NextResponse.json(
        { error: 'Invalid search type' },
        { status: 400 }
      );
    }

    const results = await performQuickSearch({
      searchType,
      userId,
      userRole,
      userDepartment,
      limit,
      offset,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Quick search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform quick search' },
      { status: 500 }
    );
  }
}
