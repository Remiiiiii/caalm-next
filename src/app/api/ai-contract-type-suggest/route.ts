import { NextRequest, NextResponse } from 'next/server';
import { suggestContractType } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers } = body as {
      answers: Array<{ questionId: string; answer: string }>;
    };

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: 'answers array is required' },
        { status: 400 }
      );
    }

    const typeId = await suggestContractType(answers);
    return NextResponse.json({ typeId });
  } catch (error) {
    console.error('AI contract type suggest error:', error);
    return NextResponse.json(
      {
        error: 'Contract type suggestion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
