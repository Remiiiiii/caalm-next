import { NextRequest, NextResponse } from 'next/server';
import { notifyInvitationAccepted } from '@/lib/utils/smsNotifications';

export async function POST(request: NextRequest) {
  try {
    // Test data for invitation acceptance SMS
    const testData = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'manager',
      department: 'IT',
    };

    console.log('Test: Triggering invitation acceptance SMS notification');

    await notifyInvitationAccepted(
      testData.email,
      testData.name,
      testData.role,
      testData.department
    );

    return NextResponse.json({
      success: true,
      message: 'Invitation acceptance SMS notification sent successfully',
      testData,
    });
  } catch (error) {
    console.error('Test: Failed to send invitation acceptance SMS:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
