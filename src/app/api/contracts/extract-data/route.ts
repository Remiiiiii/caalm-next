import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import pdfParse from 'pdf-parse';

// Add a GET route for testing
export async function GET() {
  return NextResponse.json({
    message: 'Contract extraction API is working',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

interface ExtractedContractData {
  contractName?: string;
  contractNumber?: string;
  vendor?: string;
  amount?: string;
  expiryDate?: string;
  startDate?: string;
  parties?: string[];
  keyTerms?: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Contract extraction API called');

    // Test if the route is being hit
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);

    // For now, skip file system operations and just return mock data
    // This will help us test if the API route is working
    const mockExtractedData = {
      contractName: file.name.replace(/\.[^/.]+$/, ''),
      contractNumber: 'CN-' + Date.now(),
      vendor: 'Sample Vendor',
      amount: '$50,000',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      parties: ['Company A', 'Company B'],
      keyTerms: ['Payment terms', 'Delivery schedule'],
      confidence: 85,
    };

    console.log('Returning mock extracted data:', mockExtractedData);

    return NextResponse.json({
      success: true,
      data: mockExtractedData,
      filename: file.name,
      method: 'mock-extraction',
    });

    // Mock data is already returned above, so we don't need this section
  } catch (error) {
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

async function extractContractDataFromText(
  text: string,
  filename: string
): Promise<ExtractedContractData> {
  const extracted: ExtractedContractData = {
    confidence: 0,
  };

  // Extract contract name (from filename or text)
  extracted.contractName = extractContractName(text, filename);

  // Extract contract number
  extracted.contractNumber = extractContractNumber(text);

  // Extract vendor/supplier information
  extracted.vendor = extractVendor(text);

  // Extract amount
  extracted.amount = extractAmount(text);

  // Extract dates
  const dates = extractDates(text);
  extracted.expiryDate = dates.expiryDate;
  extracted.startDate = dates.startDate;

  // Extract parties
  extracted.parties = extractParties(text);

  // Extract key terms
  extracted.keyTerms = extractKeyTerms(text);

  // Calculate confidence score
  extracted.confidence = calculateConfidence(extracted);

  return extracted;
}

function extractContractName(
  text: string,
  filename: string
): string | undefined {
  // Try to extract from text first
  const namePatterns = [
    /contract\s+(?:for|between|with)\s+([^,\n]+)/i,
    /agreement\s+(?:for|between|with)\s+([^,\n]+)/i,
    /title[:\s]*([^,\n]+)/i,
    /contract\s+title[:\s]*([^,\n]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback to filename
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/contract|agreement/i, '')
    .trim();
}

function extractContractNumber(text: string): string | undefined {
  const patterns = [
    /contract\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /agreement\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /(?:contract|agreement)\s+id[:\s]*([A-Z0-9\-]+)/i,
    /reference\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractVendor(text: string): string | undefined {
  const patterns = [
    /vendor[:\s]*([^,\n]+)/i,
    /supplier[:\s]*([^,\n]+)/i,
    /contractor[:\s]*([^,\n]+)/i,
    /between\s+([^,\n]+)\s+and/i,
    /party\s+(?:b|2)[:\s]*([^,\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractAmount(text: string): string | undefined {
  const patterns = [
    /(?:total\s+)?amount[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:contract\s+)?value[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:total\s+)?cost[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:price|fee)[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
    /\$([0-9,]+(?:\.[0-9]{2})?)/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `$${match[1].replace(/,/g, '')}`;
    }
  }

  return undefined;
}

function extractDates(text: string): {
  expiryDate?: string;
  startDate?: string;
} {
  const dates: { expiryDate?: string; startDate?: string } = {};

  // Extract expiry date
  const expiryPatterns = [
    /(?:expiry|expiration|end)\s+date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /(?:expiry|expiration|end)\s+date[:\s]*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /(?:expiry|expiration|end)\s+date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    /(?:expiry|expiration|end)\s+date[:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      dates.expiryDate = normalizeDate(match[1]);
      break;
    }
  }

  // Extract start date
  const startPatterns = [
    /(?:start|beginning|effective)\s+date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /(?:start|beginning|effective)\s+date[:\s]*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /(?:start|beginning|effective)\s+date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
  ];

  for (const pattern of startPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      dates.startDate = normalizeDate(match[1]);
      break;
    }
  }

  return dates;
}

function extractParties(text: string): string[] {
  const parties: string[] = [];

  const patterns = [
    /between\s+([^,\n]+)\s+and\s+([^,\n]+)/gi,
    /party\s+(?:a|1)[:\s]*([^,\n]+)/gi,
    /party\s+(?:b|2)[:\s]*([^,\n]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) parties.push(match[1].trim());
      if (match[2]) parties.push(match[2].trim());
    }
  }

  return [...new Set(parties)].filter((party) => party.length > 2);
}

function extractKeyTerms(text: string): string[] {
  const keyTerms: string[] = [];

  const termPatterns = [
    /(?:term|duration)[:\s]*([^,\n]+)/gi,
    /(?:payment|billing)[:\s]*([^,\n]+)/gi,
    /(?:deliverable|scope)[:\s]*([^,\n]+)/gi,
    /(?:termination|cancellation)[:\s]*([^,\n]+)/gi,
  ];

  for (const pattern of termPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const term = match[1].trim();
        if (term.length > 5 && term.length < 100) {
          keyTerms.push(term);
        }
      }
    }
  }

  return keyTerms.slice(0, 10); // Limit to 10 key terms
}

function normalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return original if parsing fails
    }
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch {
    return dateStr;
  }
}

function calculateConfidence(extracted: ExtractedContractData): number {
  let score = 0;
  let total = 0;

  // Contract name
  if (extracted.contractName) {
    score += 20;
    total += 20;
  }

  // Contract number
  if (extracted.contractNumber) {
    score += 15;
    total += 15;
  }

  // Vendor
  if (extracted.vendor) {
    score += 15;
    total += 15;
  }

  // Amount
  if (extracted.amount) {
    score += 15;
    total += 15;
  }

  // Expiry date
  if (extracted.expiryDate) {
    score += 20;
    total += 20;
  }

  // Start date
  if (extracted.startDate) {
    score += 10;
    total += 10;
  }

  // Parties
  if (extracted.parties && extracted.parties.length > 0) {
    score += 10;
    total += 10;
  }

  // Key terms
  if (extracted.keyTerms && extracted.keyTerms.length > 0) {
    score += 5;
    total += 5;
  }

  return total > 0 ? Math.round((score / total) * 100) : 0;
}
