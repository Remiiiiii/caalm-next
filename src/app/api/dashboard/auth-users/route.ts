import { NextResponse } from 'next/server';
import { getAllAuthUsers } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    // Fetch all authenticated users
    const authUsers = await getAllAuthUsers();

    return NextResponse.json({ data: authUsers });
  } catch (error) {
    console.error('Failed to fetch dashboard auth users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard auth users' },
      { status: 500 }
    );
  }
}
