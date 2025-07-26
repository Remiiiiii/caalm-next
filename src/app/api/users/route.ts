import { NextResponse } from 'next/server';
import { listAllUsers } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    console.log('Fetching all users');

    const users = await listAllUsers();
    console.log('Users fetched:', users?.length || 0);

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
