import { NextRequest, NextResponse } from 'next/server';
import { appwriteMessagingService } from '@/lib/services/appwriteMessagingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userName,
      contractName,
      daysUntilExpiry,
      contractExpiryDate,
    } = body;

    if (
      !userId ||
      !contractName ||
      daysUntilExpiry === undefined ||
      !contractExpiryDate
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: userId, contractName, daysUntilExpiry, contractExpiryDate',
        },
        { status: 400 }
      );
    }

    // Check if Appwrite messaging is configured
    if (!(await appwriteMessagingService.isConfigured())) {
      return NextResponse.json(
        {
          error:
            'Appwrite messaging is not configured. Please check your Appwrite messaging provider setup.',
        },
        { status: 500 }
      );
    }

    // Send contract expiry SMS notification
    const result =
      await appwriteMessagingService.sendContractExpiryNotification({
        userId,
        content: '', // Will be formatted by the service
        userName,
        contractName,
        daysUntilExpiry,
        contractExpiryDate,
      });

    return NextResponse.json({
      success: true,
      message: 'Contract expiry SMS notification sent successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send contract expiry SMS:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send contract expiry SMS',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isConfigured = await appwriteMessagingService.isConfigured();

    return NextResponse.json({
      configured: isConfigured,
      message: isConfigured
        ? 'Appwrite messaging is configured and ready to use'
        : 'Appwrite messaging is not configured. Please set up a messaging provider in Appwrite.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to check Appwrite messaging configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
