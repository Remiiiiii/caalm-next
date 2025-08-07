import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    console.log('Fetching current user');

    const user = await getCurrentUser();
    console.log('Current user fetched:', user ? 'found' : 'not found');

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current user' },
      { status: 500 }
    );
  }
}
