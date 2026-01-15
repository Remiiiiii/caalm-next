import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'License extraction API is working',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const body = await request.json();

      const {
        fileName: name,
        fileType: type,
        fileSize: size,
        fileContent,
      } = body;

      if (!fileContent) {
        return NextResponse.json(
          { error: 'No file content provided' },
          { status: 400 }
        );
      }

      const fileName = name || 'unknown';
      const fileType = type || 'application/octet-stream';
      const fileSize = size || 0;

      // Convert base64 to buffer
      const buffer = Buffer.from(fileContent, 'base64');

      // For now, return a simple success response with extracted license data
      // TODO: Implement actual AI extraction logic
      return NextResponse.json({
        success: true,
        data: {
          licenseName: fileName.replace(/\.[^/.]+$/, ''),
          licenseNumber: 'LIC-' + Date.now().toString().slice(-6),
          licenseType: 'subscription',
          category: 'saas',
          vendor: 'Unknown Vendor',
          product: 'Unknown Product',
          licenseExpiryDate: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          issueDate: new Date().toISOString(),
          cost: '0',
          quantity: '1',
          description: 'License extracted from file',
          filename: fileName,
          method: 'test-extraction',
          textLength: buffer.length,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('License extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract license data' },
      { status: 500 }
    );
  }
}
