import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if it's a PDF
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Extract text from the PDF
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);

      return NextResponse.json({
        success: true,
        filename,
        filepath,
        text: data.text,
        pages: data.numpages,
        info: data.info,
        method: 'pdf-parse',
      });
    } catch (extractError) {
      console.error('PDF extraction error:', extractError);
      return NextResponse.json({
        success: false,
        filename,
        filepath,
        text: 'Unable to extract text from PDF',
        error:
          extractError instanceof Error
            ? extractError.message
            : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
