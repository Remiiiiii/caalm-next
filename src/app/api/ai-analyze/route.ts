import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument, answerQuestion } from '@/lib/ai/gemini';

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
    });

    if (action === 'analyze') {
      const result = await analyzeDocument(
        fileName,
        fileType,
        fileContent,
        fileUrl
      );
      console.log('AI Analysis Result:', {
        summary: result.summary,
        keyPointsCount: result.keyPoints.length,
      });
      return NextResponse.json(result);
    } else if (action === 'question') {
      const result = await answerQuestion(
        question,
        fileName,
        fileType,
        fileContent,
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
