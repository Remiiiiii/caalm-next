import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI - Use server-side environment variable
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(apiKey || '');

// Initialize the model - Use the correct model name
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
    const prompt = `
      Analyze the following document and provide a comprehensive analysis:
      
      Document Name: ${fileName}
      Document Type: ${fileType}
      ${fileContent ? `Content: ${fileContent}` : ''}
      ${fileUrl ? `URL: ${fileUrl}` : ''}
      
      Please provide:
      1. A concise summary (2-3 sentences)
      2. Key points or findings (5-7 bullet points)
      3. Main topics or themes discussed
      4. Document type classification
      
      Format your response as JSON:
      {
        "summary": "brief summary",
        "keyPoints": ["point1", "point2", "point3"],
        "topics": ["topic1", "topic2", "topic3"],
        "documentType": "classification"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response, fallback to structured text if needed
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      // Fallback parsing if JSON is malformed
      analysis = {
        summary: text.split('\n')[0] || 'Document analysis completed',
        keyPoints: text
          .split('\n')
          .filter(
            (line) => line.trim().startsWith('-') || line.trim().startsWith('•')
          )
          .slice(0, 5),
        topics: [],
        documentType: fileType,
      };
    }

    const suggestedQuestions = getSuggestedQuestions(fileType);

    return {
      summary: analysis.summary || 'Document analysis completed',
      keyPoints: analysis.keyPoints || [],
      suggestedQuestions,
      documentType: analysis.documentType || fileType,
      topics: analysis.topics || [],
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    console.error('Error details:', {
      fileName,
      fileType,
      hasContent: !!fileContent,
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
      
      Please provide:
      1. A clear, accurate answer based on the document content
      2. If the information is not available in the document, clearly state that
      3. If you're making assumptions, clearly indicate them
      4. Provide specific references or quotes from the document when possible
      
      Format your response as JSON:
      {
        "answer": "your detailed answer",
        "confidence": 0.95,
        "sources": ["specific reference 1", "specific reference 2"]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response, fallback to plain text if needed
    let aiResponse;
    try {
      aiResponse = JSON.parse(text);
    } catch {
      aiResponse = {
        answer: text,
        confidence: 0.8,
        sources: [],
      };
    }

    return {
      answer:
        aiResponse.answer ||
        "I'm unable to provide a specific answer at this time.",
      confidence: aiResponse.confidence || 0.5,
      sources: aiResponse.sources || [],
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
  // This is a placeholder - in a real implementation, you would:
  // 1. For PDFs: Use a PDF parsing library
  // 2. For images: Use OCR to extract text
  // 3. For text files: Fetch and read the content
  // 4. For other formats: Use appropriate parsers

  try {
    if (fileType.toLowerCase() === 'txt' || fileType.toLowerCase() === 'md') {
      const response = await fetch(fileUrl);
      const content = await response.text();
      return content;
    }

    // For other file types, return a placeholder
    return `Document content for ${fileType} file. In a full implementation, this would contain the actual extracted content.`;
  } catch (error) {
    console.error('Error extracting document content:', error);
    return '';
  }
};
