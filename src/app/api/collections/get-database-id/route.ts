import { NextRequest, NextResponse } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    databaseId: appwriteConfig.databaseId,
  });
}







