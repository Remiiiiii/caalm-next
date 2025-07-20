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
      hasUrl: !!fileUrl,
    });

    // Extract file content if not provided but URL is available
    let extractedContent = fileContent;
    if (!fileContent && fileUrl) {
      console.log('Extracting content from file URL...');
      try {
        extractedContent = await extractDocumentContent(fileUrl, fileType);
        console.log(
          'Content extraction successful, length:',
          extractedContent.length
        );
      } catch (extractError) {
        console.error('Content extraction failed:', extractError);
        extractedContent = `Unable to extract content from ${fileType} file. Error: ${
          extractError instanceof Error ? extractError.message : 'Unknown error'
        }`;
      }
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
