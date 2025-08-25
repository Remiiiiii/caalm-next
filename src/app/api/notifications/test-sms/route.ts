import { NextRequest, NextResponse } from 'next/server';

// Lazy import to avoid initialization errors when Twilio is not configured
let twilioService: any = null;

async function getTwilioService() {
  if (!twilioService) {
    const { twilioService: service } = await import(
      '@/lib/services/twilioService'
    );
    twilioService = service;
  }
  return twilioService;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const twilio = await getTwilioService();

    // Check if Twilio is configured
    if (!twilio.isConfigured()) {
      return NextResponse.json(
        {
          error:
            'Twilio is not configured. Please check your environment variables.',
        },
        { status: 500 }
      );
    }

    // Format phone number
    const formattedPhone = twilio.formatPhoneNumber(phoneNumber);

    // Send test SMS
    const success = await twilio.sendSMS({
      to: formattedPhone,
      message: `[TEST] ${message}`,
      priority: 'medium',
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        phoneNumber: formattedPhone,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to send test SMS:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test SMS',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const twilio = await getTwilioService();

    // Check if Twilio is configured
    if (!twilio.isConfigured()) {
      return NextResponse.json({
        configured: false,
        error:
          'Twilio is not configured. Please check your environment variables.',
      });
    }

    // Get account info
    const accountInfo = await twilio.getAccountInfo();

    return NextResponse.json({
      configured: true,
      accountInfo,
    });
  } catch (error) {
    console.error('Failed to get Twilio account info:', error);
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to get Twilio account info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
