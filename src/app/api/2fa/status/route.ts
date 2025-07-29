import { NextRequest, NextResponse } from 'next/server';
// import { Client, Users } from 'node-appwrite';
// import { appwriteConfig } from '@/lib/appwrite/config';

// const client = new Client()
//   .setEndpoint(appwriteConfig.endpointUrl)
//   .setProject(appwriteConfig.projectId)
//   .setKey(appwriteConfig.secretKey);

// const users = new Users(client); // Will be used when implementing actual 2FA status check

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll return a mock response
    // In production, you would check the user's actual 2FA status from your database
    const has2FA = false; // This should be retrieved from your user's profile

    return NextResponse.json({
      success: true,
      has2FA,
    });
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}
