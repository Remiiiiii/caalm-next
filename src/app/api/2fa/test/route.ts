import { NextResponse } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET() {
  try {
    // Check configuration
    const config = {
      endpointUrl: appwriteConfig.endpointUrl,
      projectId: appwriteConfig.projectId,
      hasSecretKey: !!appwriteConfig.secretKey,
      secretKeyLength: appwriteConfig.secretKey
        ? appwriteConfig.secretKey.length
        : 0,
    };

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration check completed',
    });
  } catch (error) {
    console.error('Error checking configuration:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}
