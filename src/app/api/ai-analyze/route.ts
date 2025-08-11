import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeDocument,
  answerQuestion,
  extractDocumentContent,
} from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      fileName,
      fileType,
      fileContent,
      fileUrl,
      question,
      previousContext,
    } = body;

    console.log('AI API Request:', {
      action,
      fileName,
      fileType,
      hasContent: !!fileContent,
      contentLength: fileContent?.length || 0,
      hasUrl: !!fileUrl,
      fileUrl: fileUrl ? fileUrl.substring(0, 100) + '...' : null,
    });

    // Extract file content if not provided but URL is available
    let extractedContent = fileContent;
    if (!fileContent && fileUrl) {
      console.log('Extracting content from file URL...');
      try {
        // For PDFs, use the dedicated extraction API
        if (fileType.toLowerCase() === 'pdf') {
          console.log('Using dedicated PDF extraction API...');
          const extractResponse = await fetch(
            `${
              process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            }/api/extract-pdf-text`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl, fileName }),
            }
          );

          if (!extractResponse.ok) {
            throw new Error(`PDF extraction failed: ${extractResponse.status}`);
          }

          const extractResult = await extractResponse.json();
          extractedContent =
            extractResult.text || 'No text content extracted from PDF';
          console.log(
            'PDF extraction successful, length:',
            extractedContent.length
          );
        } else {
          // For other file types, use the existing extractDocumentContent function
          extractedContent = await extractDocumentContent(fileUrl, fileType);
          console.log(
            'Content extraction successful, length:',
            extractedContent.length
          );
        }
      } catch (extractError) {
        console.error('Content extraction failed for:', {
          fileUrl,
          fileType,
          errorMessage:
            extractError instanceof Error
              ? extractError.message
              : 'Unknown error',
        });
        extractedContent = `Unable to extract content from ${fileType} file. Error: ${
          extractError instanceof Error ? extractError.message : 'Unknown error'
        }`;
      }
    } else if (fileContent) {
      console.log('Using provided file content, length:', fileContent.length);
      extractedContent = fileContent;
    }

    if (action === 'analyze') {
      const result = await analyzeDocument(
        fileName,
        fileType,
        extractedContent,
        fileUrl
      );
      console.log('AI Analysis Result:', {
        summary: result.summary,
        keyPointsCount: result.keyPoints.length,
        suggestedQuestionsCount: result.suggestedQuestions.length,
      });
      return NextResponse.json(result);
    } else if (action === 'question') {
      const result = await answerQuestion(
        question,
        fileName,
        fileType,
        extractedContent,
        fileUrl,
        previousContext
      );
      console.log('AI Question Result:', {
        answerLength: result.answer.length,
        confidence: result.confidence,
      });
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
