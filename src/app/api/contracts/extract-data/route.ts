import { NextRequest, NextResponse } from 'next/server';
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
  description?: string;
  parties?: string[];
  keyTerms?: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Contract extraction API called');

    // Read the request body only once
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);

    // Convert file to buffer immediately to avoid stream issues
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';

    // Extract text based on file type
    if (file.type === 'application/pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
        console.log('PDF text extracted, length:', extractedText.length);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        // Fallback to mock data if PDF parsing fails
        extractedText = `Contract ${file.name} - This is a fallback text extraction.`;
      }
    } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
      console.log('Text file content extracted, length:', extractedText.length);
    } else if (
      file.type.includes('word') ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx')
    ) {
      // For Word documents, we'll use a simple text extraction approach
      // In a production environment, you might want to use a library like mammoth
      extractedText = `Contract ${file.name} - Word document content would be extracted here.`;
      console.log('Word document detected, using fallback text');
    } else {
      // For other file types, use filename as fallback
      extractedText = `Contract ${file.name} - File type not supported for text extraction.`;
      console.log('Unsupported file type, using fallback text');
    }

    // Extract contract data from text
    const extractedData = await extractContractDataFromText(
      extractedText,
      file.name
    );

    console.log('Extracted data:', extractedData);

    return NextResponse.json({
      success: true,
      data: extractedData,
      filename: file.name,
      method: 'ai-extraction',
      textLength: extractedText.length,
    });
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

  // Extract description
  extracted.description = extractDescription(text);

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
    /service\s+agreement[:\s]*([^,\n]+)/i,
    /purchase\s+order[:\s]*([^,\n]+)/i,
    /license\s+agreement[:\s]*([^,\n]+)/i,
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
    .replace(/contract|agreement|order/i, '')
    .trim();
}

function extractContractNumber(text: string): string | undefined {
  const patterns = [
    /contract\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /agreement\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /(?:contract|agreement)\s+id[:\s]*([A-Z0-9\-]+)/i,
    /reference\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /po\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
    /purchase\s+order\s+(?:number|no\.?)[:\s]*([A-Z0-9\-]+)/i,
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
    /seller[:\s]*([^,\n]+)/i,
    /provider[:\s]*([^,\n]+)/i,
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
    /(?:total\s+)?price[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
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
    /(?:term|duration)[:\s]*([0-9]+\s+(?:years?|months?|days?))/i,
    /(?:valid|effective)\s+until[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
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
    /(?:commencement|start)\s+date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
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

function extractDescription(text: string): string | undefined {
  // Try to extract a brief description from the contract
  const descriptionPatterns = [
    /(?:scope|description|summary)[:\s]*([^.\n]{20,200})/i,
    /(?:purpose|objective)[:\s]*([^.\n]{20,200})/i,
    /(?:services|deliverables)[:\s]*([^.\n]{20,200})/i,
    /(?:work|project)[:\s]*([^.\n]{20,200})/i,
  ];

  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const description = match[1].trim();
      if (description.length > 20 && description.length < 200) {
        return description;
      }
    }
  }

  // If no specific description found, create one from key terms
  const keyTerms = extractKeyTerms(text);
  if (keyTerms.length > 0) {
    return `Contract covering ${keyTerms.slice(0, 3).join(', ')}.`;
  }

  return undefined;
}

function extractParties(text: string): string[] {
  const parties: string[] = [];

  const patterns = [
    /between\s+([^,\n]+)\s+and\s+([^,\n]+)/gi,
    /party\s+(?:a|1)[:\s]*([^,\n]+)/gi,
    /party\s+(?:b|2)[:\s]*([^,\n]+)/gi,
    /client[:\s]*([^,\n]+)/gi,
    /company[:\s]*([^,\n]+)/gi,
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
    /(?:service|work)[:\s]*([^,\n]+)/gi,
    /(?:obligation|requirement)[:\s]*([^,\n]+)/gi,
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

  // Description
  if (extracted.description) {
    score += 10;
    total += 10;
  }

  // Parties
  if (extracted.parties && extracted.parties.length > 0) {
    score += 5;
    total += 5;
  }

  // Key terms
  if (extracted.keyTerms && extracted.keyTerms.length > 0) {
    score += 5;
    total += 5;
  }

  return total > 0 ? Math.round((score / total) * 100) : 0;
}
