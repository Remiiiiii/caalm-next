export interface ContractAnalysis {
  keyTerms: string[];
  importantDates: { label: string; date: string; context?: string }[];
  financialInfo: { label: string; value: string; context?: string }[];
  parties: { name: string; role: string; contact?: string }[];
  risks: {
    risk: string;
    severity: 'low' | 'medium' | 'high';
    context?: string;
  }[];
  opportunities: {
    opportunity: string;
    impact: 'low' | 'medium' | 'high';
    context?: string;
  }[];
  recommendations: {
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    context?: string;
  }[];
  complianceRequirements: {
    requirement: string;
    category: string;
    deadline?: string;
  }[];
  performanceMetrics: { metric: string; target?: string; frequency?: string }[];
  summary: string;
  confidence: number;
}

export interface AIAnalysisRequest {
  content: string;
  contractTitle?: string;
  contractType?: string;
  analysisType?: 'comprehensive' | 'financial' | 'compliance' | 'risk';
}

import { model } from '@/lib/ai/gemini';
import { SAMContract } from '@/lib/sam-config';

export class ContractAnalyzer {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
  }

  async analyzeContract(request: AIAnalysisRequest): Promise<ContractAnalysis> {
    if (!this.apiKey) {
      throw new Error(
        'Google Gemini API key is required for contract analysis'
      );
    }

    const prompt = this.buildAnalysisPrompt(request);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      if (!analysisText) {
        throw new Error('No analysis content received from AI');
      }

      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error('Contract analysis error:', error);
      throw new Error(
        `Failed to analyze contract: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    const {
      content,
      contractTitle,
      contractType,
      analysisType = 'comprehensive',
    } = request;

    return `You are an expert contract analyst with deep knowledge of legal documents, government contracts, and business agreements. Analyze the provided contract content and extract structured information.

Contract Information:
- Title: ${contractTitle || 'Not specified'}
- Type: ${contractType || 'Not specified'}
- Analysis Type: ${analysisType}

Contract Content:
${content.substring(0, 8000)}${content.length > 8000 ? '... (truncated)' : ''}

Please provide a comprehensive analysis in the following JSON format:

{
  "keyTerms": ["term1", "term2", "term3"],
  "importantDates": [
    {"label": "Contract Start Date", "date": "YYYY-MM-DD", "context": "brief context"},
    {"label": "Contract End Date", "date": "YYYY-MM-DD", "context": "brief context"}
  ],
  "financialInfo": [
    {"label": "Contract Value", "value": "$X", "context": "brief context"},
    {"label": "Payment Terms", "value": "description", "context": "brief context"}
  ],
  "parties": [
    {"name": "Party Name", "role": "Contractor/Client/etc", "contact": "contact info if available"}
  ],
  "risks": [
    {"risk": "Risk description", "severity": "low/medium/high", "context": "brief context"}
  ],
  "opportunities": [
    {"opportunity": "Opportunity description", "impact": "low/medium/high", "context": "brief context"}
  ],
  "recommendations": [
    {"recommendation": "Recommendation text", "priority": "low/medium/high", "context": "brief context"}
  ],
  "complianceRequirements": [
    {"requirement": "Compliance requirement", "category": "Legal/Regulatory/Technical", "deadline": "YYYY-MM-DD if specified"}
  ],
  "performanceMetrics": [
    {"metric": "Performance metric", "target": "target value if specified", "frequency": "measurement frequency"}
  ],
  "summary": "A comprehensive summary of the contract analysis",
  "confidence": 0.85
}

Guidelines:
1. Extract only information that is explicitly stated or clearly implied in the document
2. Use "Not specified" or "Not found" for missing information rather than making assumptions
3. Provide context for important findings
4. Assess severity/impact levels based on standard business practices
5. Focus on actionable insights and practical recommendations
6. Ensure all dates are in YYYY-MM-DD format
7. Provide a confidence score between 0 and 1 based on the clarity and completeness of the document

Return only valid JSON without any additional text or formatting.`;
  }

  private parseAnalysisResponse(responseText: string): ContractAnalysis {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and provide defaults for required fields
      return {
        keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
        importantDates: Array.isArray(parsed.importantDates)
          ? parsed.importantDates
          : [],
        financialInfo: Array.isArray(parsed.financialInfo)
          ? parsed.financialInfo
          : [],
        parties: Array.isArray(parsed.parties) ? parsed.parties : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        opportunities: Array.isArray(parsed.opportunities)
          ? parsed.opportunities
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
        complianceRequirements: Array.isArray(parsed.complianceRequirements)
          ? parsed.complianceRequirements
          : [],
        performanceMetrics: Array.isArray(parsed.performanceMetrics)
          ? parsed.performanceMetrics
          : [],
        summary: parsed.summary || 'Analysis completed successfully.',
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      };
    } catch (error) {
      console.error('Error parsing AI analysis response:', error);
      throw new Error('Failed to parse AI analysis response');
    }
  }

  // Fallback analysis for when AI is not available
  generateFallbackAnalysis(
    content: string,
    contract?: SAMContract
  ): ContractAnalysis {
    const fallbackAnalysis: ContractAnalysis = {
      keyTerms: this.extractKeyTerms(content),
      importantDates: this.extractDates(content, contract),
      financialInfo: this.extractFinancialInfo(content, contract),
      parties: this.extractParties(content, contract),
      risks: [
        {
          risk: 'Document analysis requires AI service',
          severity: 'medium',
          context: 'AI service not available',
        },
      ],
      opportunities: [
        {
          opportunity: 'Enable AI analysis for detailed insights',
          impact: 'high',
          context: 'AI service would provide comprehensive analysis',
        },
      ],
      recommendations: [
        {
          recommendation: 'Configure AI service for enhanced analysis',
          priority: 'high',
          context: 'AI service configuration needed',
        },
      ],
      complianceRequirements: [],
      performanceMetrics: [],
      summary:
        'Basic analysis completed. AI service is required for comprehensive contract analysis.',
      confidence: 0.3,
    };

    return fallbackAnalysis;
  }

  private extractKeyTerms(content: string): string[] {
    const commonTerms = [
      'contract',
      'agreement',
      'terms',
      'conditions',
      'obligations',
      'deliverables',
      'payment',
      'termination',
      'liability',
      'confidentiality',
      'intellectual property',
      'governing law',
      'dispute resolution',
    ];

    return commonTerms
      .filter((term) => content.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 10);
  }

  private extractDates(
    content: string,
    contract?: SAMContract
  ): { label: string; date: string; context?: string }[] {
    const dates: { label: string; date: string; context?: string }[] = [];

    if (contract?.postedDate) {
      dates.push({ label: 'Posted Date', date: contract.postedDate });
    }
    if (contract?.responseDeadLine) {
      dates.push({
        label: 'Response Deadline',
        date: contract.responseDeadLine,
      });
    }
    if (contract?.archiveDate) {
      dates.push({ label: 'Archive Date', date: contract.archiveDate });
    }

    return dates;
  }

  private extractFinancialInfo(
    content: string,
    contract?: SAMContract
  ): { label: string; value: string; context?: string }[] {
    const financialInfo: { label: string; value: string; context?: string }[] =
      [];

    if (contract?.type) {
      financialInfo.push({ label: 'Contract Type', value: contract.type });
    }
    if (contract?.typeOfSetAsideDescription) {
      financialInfo.push({
        label: 'Set-Aside',
        value: contract.typeOfSetAsideDescription,
      });
    }

    return financialInfo;
  }

  private extractParties(
    content: string,
    contract?: SAMContract
  ): { name: string; role: string; contact?: string }[] {
    const parties: { name: string; role: string; contact?: string }[] = [];

    if (contract?.fullParentPathName) {
      parties.push({
        name: contract.fullParentPathName,
        role: 'Contracting Agency',
        contact:
          contract.pointOfContact?.[0]?.email ||
          contract.pointOfContact?.[0]?.phone,
      });
    }

    return parties;
  }
}

// Singleton instance
export const contractAnalyzer = new ContractAnalyzer();
