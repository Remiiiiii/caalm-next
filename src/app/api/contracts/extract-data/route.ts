import { NextRequest, NextResponse } from 'next/server';

// Add a GET route for testing
export async function GET() {
  return NextResponse.json({
    message: 'Contract extraction API is working',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CONTRACT EXTRACTION API START ===');
    console.log('Contract extraction API called');

    // First, let's test if we can read the request at all
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (contentType?.includes('application/json')) {
      console.log('Processing JSON request...');

      // Test reading the request body
      let body;
      try {
        body = await request.json();
        console.log('Successfully read JSON body');
        console.log('Body keys:', Object.keys(body));
      } catch (jsonError) {
        console.error('Failed to read JSON body:', jsonError);
        return NextResponse.json(
          { error: 'Failed to parse JSON request body' },
          { status: 400 }
        );
      }

      const {
        fileName: name,
        fileType: type,
        fileSize: size,
        fileContent,
      } = body;

      if (!fileContent) {
        console.log('No file content provided in JSON payload');
        return NextResponse.json(
          { error: 'No file content provided' },
          { status: 400 }
        );
      }

      const fileName = name || 'unknown';
      const fileType = type || 'application/octet-stream';
      const fileSize = size || 0;

      console.log('File details from JSON:', { fileName, fileType, fileSize });
      console.log('Base64 content length:', fileContent.length);

      // Convert base64 to buffer
      let buffer;
      try {
        console.log('Converting base64 to buffer...');
        const binaryString = atob(fileContent);
        console.log('Binary string length:', binaryString.length);

        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = Buffer.from(bytes);
        console.log('Buffer created, length:', buffer.length);
      } catch (base64Error) {
        console.error('Base64 decoding error:', base64Error);
        return NextResponse.json(
          { error: 'Invalid base64 file content' },
          { status: 400 }
        );
      }

      console.log('File received via JSON:', fileName, fileType, fileSize);

      // For now, return a simple success response to test the flow
      console.log('=== CONTRACT EXTRACTION API SUCCESS ===');
      return NextResponse.json({
        success: true,
        data: {
          contractName: fileName.replace(/\.[^/.]+$/, ''),
          contractNumber: 'TEST-001',
          vendor: 'Test Vendor',
          amount: '$1,000',
          expiryDate: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          description: 'Test contract extracted successfully',
        },
        filename: fileName,
        method: 'test-extraction',
        textLength: buffer.length,
      });
    } else {
      console.log('Processing FormData request...');
      // Handle FormData (legacy approach)
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.log('No file provided');
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      const fileName = file.name;
      const fileType = file.type;
      const fileSize = file.size;

      // Convert file to buffer immediately to avoid stream issues
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      console.log('File received via FormData:', fileName, fileType, fileSize);

      // Return test data for FormData as well
      return NextResponse.json({
        success: true,
        data: {
          contractName: fileName.replace(/\.[^/.]+$/, ''),
          contractNumber: 'TEST-002',
          vendor: 'Test Vendor',
          amount: '$2,000',
          expiryDate: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          description: 'Test contract extracted successfully',
        },
        filename: fileName,
        method: 'test-extraction',
        textLength: buffer.length,
      });
    }
  } catch (error) {
    console.error('=== CONTRACT EXTRACTION API ERROR ===');
    console.error('Contract data extraction error:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract contract data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
