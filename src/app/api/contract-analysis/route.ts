import { NextRequest, NextResponse } from 'next/server';
import {
  contractAnalyzer,
  AIAnalysisRequest,
} from '@/lib/ai-contract-analyzer';

export async function POST(request: NextRequest) {
  let body: AIAnalysisRequest;

  try {
    body = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: 'Contract content is required' },
        { status: 400 }
      );
    }

    console.log('Contract Analysis Request:', {
      contentLength: body.content.length,
      contractTitle: body.contractTitle,
      contractType: body.contractType,
      analysisType: body.analysisType,
    });

    // Perform AI analysis
    const analysis = await contractAnalyzer.analyzeContract(body);

    console.log('Contract Analysis Completed:', {
      keyTermsCount: analysis.keyTerms.length,
      datesCount: analysis.importantDates.length,
      partiesCount: analysis.parties.length,
      risksCount: analysis.risks.length,
      confidence: analysis.confidence,
    });

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Contract analysis API error:', error);

    // If AI analysis fails, try fallback analysis
    try {
      const fallbackAnalysis = contractAnalyzer.generateFallbackAnalysis(
        body.content,
        { title: body.contractTitle, type: body.contractType }
      );

      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        fallback: true,
        error:
          error instanceof Error
            ? error.message
            : 'AI analysis failed, using fallback',
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError) {
      console.error('Fallback analysis also failed:', fallbackError);

      return NextResponse.json(
        {
          error: 'Contract analysis failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback: false,
        },
        { status: 500 }
      );
    }
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Contract Analysis API',
      endpoints: {
        POST: '/api/contract-analysis',
        description: 'Analyze contract content using AI',
        body: {
          content: 'string (required)',
          contractTitle: 'string (optional)',
          contractType: 'string (optional)',
          analysisType: 'comprehensive|financial|compliance|risk (optional)',
        },
      },
    },
    { status: 200 }
  );
}
