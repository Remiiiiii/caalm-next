import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    // Method 1: Try pdf-parse-debugging-disabled (fixed version)
    try {
      console.log(
        'Attempting PDF extraction with pdf-parse-debugging-disabled...'
      );
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pdfParse = (await import('pdf-parse-debugging-disabled')).default;
      const data = await pdfParse(buffer);

      if (data.text && data.text.trim().length > 0) {
        console.log(
          'PDF extraction successful with pdf-parse-debugging-disabled'
        );
        return NextResponse.json({
          text: data.text,
          pages: data.numpages,
          info: data.info,
          method: 'pdf-parse-debugging-disabled',
        });
      } else {
        throw new Error('No text content extracted');
      }
    } catch (pdfParseError) {
      console.error('pdf-parse-debugging-disabled failed:', pdfParseError);
    }

    // Method 2: Try PDF.js with Node.js compatibility
    try {
      console.log('Attempting PDF extraction with PDF.js...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Import PDF.js with Node.js compatibility
      const pdfjsLib = await import('pdfjs-dist');

      // Set up the worker for Node.js environment
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const numPages = pdf.numPages;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Combine text items
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str || '' : ''))
          .join(' ');

        fullText += pageText + '\n';
      }

      if (fullText.trim().length > 0) {
        console.log('PDF extraction successful with PDF.js');
        return NextResponse.json({
          text: fullText.trim(),
          pages: numPages,
          info: { numPages },
          method: 'pdfjs',
        });
      } else {
        throw new Error('No text content extracted');
      }
    } catch (pdfjsError) {
      console.error('PDF.js failed:', pdfjsError);
    }

    // If all methods fail, return a helpful error message
    console.log('All PDF extraction methods failed');
    return NextResponse.json({
      text: `Unable to extract text from PDF "${fileName}". This may be due to:\n\n- The PDF being password protected\n- The PDF containing only images/scanned content\n- The PDF being corrupted or in an unsupported format\n- The PDF having complex layouts that are difficult to parse\n\nPlease ensure the PDF contains selectable text for AI analysis. You can try:\n1. Opening the PDF in a text editor to verify it contains text\n2. Converting the PDF to a different format\n3. Using a PDF that was created from a text document rather than scanned images`,
      pages: 0,
      info: null,
      method: 'all-methods-failed',
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF text' },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: 'PDF extraction endpoint' });
}
