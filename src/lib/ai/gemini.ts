import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI - Use server-side environment variable
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(apiKey || '');

// Initialize the model - Use the correct model name
export const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
});

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  suggestedQuestions: string[];
  documentType: string;
  topics: string[];
}

export interface AIResponse {
  answer: string;
  confidence: number;
  sources?: string[];
}

// Suggested questions based on document type
const getSuggestedQuestions = (documentType: string): string[] => {
  const baseQuestions = [
    'What is the main purpose of this document?',
    'What are the key points or findings?',
    'Who are the main parties or stakeholders mentioned?',
    'What is the expiration date of this contract?',
    'What actions are required or recommended?',
  ];

  const typeSpecificQuestions: { [key: string]: string[] } = {
    pdf: [
      'Can you summarize the main sections of this document?',
      'What are the most important details I should know?',
      'Are there any legal implications or requirements mentioned?',
      'What are the next steps or recommendations?',
    ],
    doc: [
      'What is the document structure and organization?',
      'What are the key takeaways from this document?',
      'Are there any important figures or data mentioned?',
      'What are the main conclusions or recommendations?',
    ],
    docx: [
      'What is the document structure and organization?',
      'What are the key takeaways from this document?',
      'Are there any important figures or data mentioned?',
      'What are the main conclusions or recommendations?',
    ],
    txt: [
      'What is the main content of this text file?',
      'Are there any important patterns or information?',
      'What should I focus on in this document?',
      'Are there any key terms or concepts I should understand?',
    ],
    jpg: [
      'What can you see in this image?',
      'Are there any important details or text visible?',
      'What is the context or purpose of this image?',
      'Are there any people, objects, or locations shown?',
    ],
    jpeg: [
      'What can you see in this image?',
      'Are there any important details or text visible?',
      'What is the context or purpose of this image?',
      'Are there any people, objects, or locations shown?',
    ],
    png: [
      'What can you see in this image?',
      'Are there any important details or text visible?',
      'What is the context or purpose of this image?',
      'Are there any people, objects, or locations shown?',
    ],
  };

  const specificQuestions =
    typeSpecificQuestions[documentType.toLowerCase()] || [];
  return [...baseQuestions, ...specificQuestions].slice(0, 8); // Limit to 8 questions
};

// Analyze document content and extract key information
export const analyzeDocument = async (
  fileName: string,
  fileType: string,
  fileContent?: string,
  fileUrl?: string
): Promise<DocumentAnalysis> => {
  try {
    console.log('Starting document analysis:', {
      fileName,
      fileType,
      hasContent: !!fileContent,
      contentLength: fileContent?.length || 0,
      hasUrl: !!fileUrl,
    });

    const prompt = `
      Analyze the following document and provide a comprehensive analysis in plain text:
      
      Document Name: ${fileName}
      Document Type: ${fileType}
      ${fileContent ? `Content: ${fileContent}` : 'No content available'}
      ${fileUrl ? `URL: ${fileUrl}` : ''}
      
      Please provide your analysis in this exact format:
      
      SUMMARY:
      [Provide a concise 2-3 sentence summary of the document]
      
      KEY POINTS:
      • [First key point]
      • [Second key point]
      • [Third key point]
      • [Fourth key point]
      • [Fifth key point]
      
      TOPICS:
      [List main topics or themes discussed, separated by commas]
      
      DOCUMENT TYPE:
      [Classify the document type]
    `;

    console.log('Sending prompt to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Received AI response, length:', text.length);

    // Parse the plain text response
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let summary = '';
    let keyPoints: string[] = [];
    let topics: string[] = [];
    let documentType = fileType;

    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('SUMMARY:')) {
        currentSection = 'summary';
        continue;
      } else if (line.startsWith('KEY POINTS:')) {
        currentSection = 'keyPoints';
        continue;
      } else if (line.startsWith('TOPICS:')) {
        currentSection = 'topics';
        continue;
      } else if (line.startsWith('DOCUMENT TYPE:')) {
        currentSection = 'documentType';
        continue;
      }

      if (currentSection === 'summary' && line) {
        summary = line;
      } else if (currentSection === 'keyPoints' && line.startsWith('•')) {
        keyPoints.push(line.substring(1).trim());
      } else if (currentSection === 'topics' && line) {
        topics = line
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      } else if (currentSection === 'documentType' && line) {
        documentType = line;
      }
    }

    // Fallback if parsing fails
    if (!summary) {
      summary = text.split('\n')[0] || 'Document analysis completed';
    }
    if (keyPoints.length === 0) {
      keyPoints = text
        .split('\n')
        .filter(
          (line) => line.trim().startsWith('•') || line.trim().startsWith('-')
        )
        .map((line) => line.replace(/^[•\-]\s*/, ''))
        .slice(0, 5);
    }

    const suggestedQuestions = getSuggestedQuestions(documentType);

    console.log('Analysis completed successfully:', {
      summaryLength: summary.length,
      keyPointsCount: keyPoints.length,
      topicsCount: topics.length,
      suggestedQuestionsCount: suggestedQuestions.length,
    });

    return {
      summary: summary || 'Document analysis completed',
      keyPoints: keyPoints,
      suggestedQuestions,
      documentType: documentType,
      topics: topics,
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    console.error('Error details:', {
      fileName,
      fileType,
      hasContent: !!fileContent,
      contentLength: fileContent?.length || 0,
      hasUrl: !!fileUrl,
      apiKeyExists: !!process.env.GOOGLE_API_KEY,
      apiKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
      modelName: 'gemini-2.0-flash-exp',
    });
    return {
      summary: 'Unable to analyze document at this time',
      keyPoints: [],
      suggestedQuestions: getSuggestedQuestions(fileType),
      documentType: fileType,
      topics: [],
    };
  }
};

// Answer specific questions about the document
export const answerQuestion = async (
  question: string,
  fileName: string,
  fileType: string,
  fileContent?: string,
  fileUrl?: string,
  previousContext?: string
): Promise<AIResponse> => {
  try {
    const contextPrompt = previousContext
      ? `Previous conversation context: ${previousContext}\n\n`
      : '';

    const prompt = `
      ${contextPrompt}
      You are an AI assistant analyzing a document. Please answer the following question about the document:
      
      Document Name: ${fileName}
      Document Type: ${fileType}
      ${fileContent ? `Content: ${fileContent}` : ''}
      ${fileUrl ? `URL: ${fileUrl}` : ''}
      
      Question: ${question}
      
      Please provide a clear, accurate answer based on the document content. If the information is not available in the document, clearly state that. If you're making assumptions, clearly indicate them. Provide specific references or quotes from the document when possible.
      
      Answer in plain text format - no JSON, no special formatting, just a natural, human-readable response.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // The response is now plain text, so we can use it directly
    return {
      answer: text || "I'm unable to provide a specific answer at this time.",
      confidence: 0.8, // Default confidence for plain text responses
      sources: [], // We'll extract sources from the text if needed in the future
    };
  } catch (error) {
    console.error('Error answering question:', error);
    return {
      answer:
        "I'm sorry, I encountered an error while processing your question. Please try again.",
      confidence: 0.0,
      sources: [],
    };
  }
};

// Get document content for analysis (placeholder for file content extraction)
export const extractDocumentContent = async (
  fileUrl: string,
  fileType: string
): Promise<string> => {
  try {
    console.log('Starting content extraction:', { fileUrl, fileType });
    const fileTypeLower = fileType.toLowerCase();

    // For text files, fetch and return content directly
    if (
      [
        'txt',
        'md',
        'json',
        'xml',
        'html',
        'css',
        'js',
        'ts',
        'jsx',
        'tsx',
      ].includes(fileTypeLower)
    ) {
      console.log('Extracting text file content...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch text file: ${response.statusText}`);
      }
      const content = await response.text();
      console.log('Text file content extracted, length:', content.length);
      return content;
    }

    // For PDFs, extract text using pdf-parse
    if (fileTypeLower === 'pdf') {
      console.log('Extracting PDF content...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use dynamic import to avoid module loading issues
      const pdfParse = (await import('pdf-parse-debugging-disabled')).default;
      const data = await pdfParse(buffer);
      const text = data.text || 'No text content found in PDF';
      console.log('PDF content extracted, length:', text.length);
      return text;
    }

    // For images, use OCR to extract text
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileTypeLower)) {
      console.log('Extracting image content using OCR...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use dynamic import to avoid module loading issues
      const Tesseract = (await import('tesseract.js')).default;
      const {
        data: { text },
      } = await Tesseract.recognize(buffer, 'eng');

      const extractedText = text || 'No text found in image';
      console.log('Image OCR completed, length:', extractedText.length);
      return extractedText;
    }

    // For Microsoft Office documents
    if (['docx', 'doc'].includes(fileTypeLower)) {
      console.log('Extracting Word document content...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Word document: ${response.statusText}`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use dynamic import to avoid module loading issues
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || 'No text content found in Word document';
      console.log('Word document content extracted, length:', text.length);
      return text;
    }

    if (['xlsx', 'xls'].includes(fileTypeLower)) {
      console.log('Extracting Excel document content...');
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Excel document: ${response.statusText}`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use dynamic import to avoid module loading issues
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';

      // Extract text from all sheets
      workbook.SheetNames.forEach((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const sheetText = sheetData
          .map((row: unknown) =>
            Array.isArray(row) ? row.join('\t') : JSON.stringify(row)
          )
          .join('\n');
        text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      });

      const extractedText = text || 'No text content found in Excel document';
      console.log(
        'Excel document content extracted, length:',
        extractedText.length
      );
      return extractedText;
    }

    if (['pptx', 'ppt'].includes(fileTypeLower)) {
      console.log('PowerPoint document detected, returning placeholder');
      return `PowerPoint document (${fileTypeLower}). PowerPoint text extraction requires additional libraries like pptxjs or similar.`;
    }

    // For other file types, return a generic message
    console.log('Unsupported file type:', fileTypeLower);
    return `File type ${fileTypeLower} is not yet supported for text extraction. The AI will work with the file metadata and any available description.`;
  } catch (error) {
    console.error('Error extracting document content:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Content extraction failed for:', {
      fileUrl,
      fileType,
      errorMessage,
    });
    return `Error extracting content from ${fileType} file: ${errorMessage}`;
  }
};
