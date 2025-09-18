'use client';

import React, {
  useState,
  useEffect,
  // useMemo,
  useCallback,
} from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
import {
  // Search,
  // ZoomIn,
  // ZoomOut,
  Download,
  // Printer,
  // ChevronUp,
  // ChevronDown,
  // FileText,
  Bot,
  Lightbulb,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2,
  // Copy,
  X,
  Users,
  Shield,
  Target,
  Building,
  MapPin,
  User,
  File,
  // MessageCircle,
  Star,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  // Clock,
  Phone,
  Mail,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileText,
} from 'lucide-react';
import { SAMContract } from '@/lib/sam-config';
import { ContractAnalysis } from '@/lib/ai-contract-analyzer';
import Image from 'next/image';

interface ContractDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  contract: SAMContract | null;
  contractContent?: string;
}

// Using the ContractAnalysis interface from the AI analyzer
type AIAnalysis = ContractAnalysis;

const ContractDocumentViewer: React.FC<ContractDocumentViewerProps> = ({
  isOpen,
  onClose,
  contract,
  contractContent,
}) => {
  // Document state
  const [content, setContent] = useState<string>('');
  // const [zoom, setZoom] = useState<number>(100);
  // const [searchTerm, setSearchTerm] = useState<string>('');
  // const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  // const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // UI state
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [showSmartSummary, setShowSmartSummary] = useState<boolean>(true);
  const [showMainDescription, setShowMainDescription] =
    useState<boolean>(false);

  // SWR fetcher function
  const fetcher = useCallback(async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }, []);

  // SWR hook for contract details
  const { data: swrData, error: swrError } = useSWR(
    contract
      ? `/api/sam/contract-details?noticeId=${encodeURIComponent(
          contract.noticeId
        )}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2,
      onError: (error) => {
        console.error('SWR error fetching contract details:', error);
      },
      onSuccess: (data) => {
        if (data.success && data.data) {
          console.log('Contract details fetched successfully:', {
            source: data.source,
            hasDescription: !!data.data.description,
            resourceLinksCount: data.data.resourceLinks?.length || 0,
            attachmentsCount: data.data.attachments?.length || 0,
          });
        }
      },
    }
  );

  // Extract contract details from SWR response
  const contractDetails = swrData?.success ? swrData.data : null;

  // Handle SWR errors
  useEffect(() => {
    if (swrError) {
      console.error('SWR error:', swrError.message);
    }
  }, [swrError]);

  // Generate document content from contract object
  const generateDocumentContent = useCallback(
    (contract: SAMContract): string => {
      const description =
        contractDetails?.description ||
        contract.description ||
        'No description available.';
      const resourceLinks =
        contractDetails?.resourceLinks || contract.resourceLinks || [];

      return `
GOVERNMENT CONTRACT OPPORTUNITY

Document ID: ${contract.noticeId}
Title: ${contract.title}

BASIC INFORMATION
=================

Solicitation Number: ${contract.solicitationNumber || 'N/A'}
Type: ${contract.type || 'N/A'}
Set-Aside Type: ${contract.typeOfSetAsideDescription || 'N/A'}
Competition Type: ${contract.fullParentPathName || 'N/A'}

IMPORTANT DATES
===============

Posted Date: ${
        contract.postedDate
          ? new Date(contract.postedDate).toLocaleDateString()
          : 'N/A'
      }
Response Due Date: ${
        contract.responseDeadLine
          ? new Date(contract.responseDeadLine).toLocaleDateString()
          : 'N/A'
      }
Archive Date: ${
        contract.archiveDate
          ? new Date(contract.archiveDate).toLocaleDateString()
          : 'N/A'
      }

LOCATION INFORMATION
===================

Office: ${contract.officeAddress?.city || 'N/A'}, ${
        contract.officeAddress?.state || 'N/A'
      } ${contract.officeAddress?.zipcode || ''}
Point of Contact: ${contract.pointOfContact?.[0]?.fullName || 'N/A'}
Email: ${contract.pointOfContact?.[0]?.email || 'N/A'}
Phone: ${contract.pointOfContact?.[0]?.phone || 'N/A'}

DESCRIPTION
===========

${description}

ADDITIONAL INFORMATION
=====================

NAICS Code: ${contract.naicsCode || 'N/A'}
Classification Code: ${contract.classificationCode || 'N/A'}
Active Status: ${contract.active ? 'Active' : 'Inactive'}

RESOURCE LINKS
==============

${
  resourceLinks.length > 0
    ? resourceLinks
        .map(
          (link: { title?: string; url?: string; href?: string }) =>
            `${link.title || 'Link'}: ${'url' in link ? link.url : link.href}`
        )
        .join('\n')
    : 'No resource links available.'
}

${
  contractDetails?.attachments && contractDetails.attachments.length > 0
    ? `
ATTACHMENTS
===========

${contractDetails.attachments
  .map(
    (attachment: { title: string; url: string }) =>
      `${attachment.title}: ${attachment.url}`
  )
  .join('\n')}
`
    : ''
}
    `;
    },
    [contractDetails]
  );

  // Generate document content from contract data
  useEffect(() => {
    if (contract) {
      const documentContent = generateDocumentContent(contract);
      setContent(contractContent || documentContent);
    }
  }, [contract, contractContent, contractDetails, generateDocumentContent]);

  // Helper function to get time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays > 1) return `${diffInDays} days ago`;
    if (diffInDays < 0) return `in ${Math.abs(diffInDays)} days`;
    return 'Unknown';
  };

  // Helper function to get urgency indicator
  const getUrgencyIndicator = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffInMs = due.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return { color: 'text-red-500', text: 'Overdue' };
    if (diffInDays <= 1) return { color: 'text-red-500', text: 'Due today' };
    if (diffInDays <= 3) return { color: 'text-yellow-500', text: 'Due soon' };
    if (diffInDays <= 7)
      return { color: 'text-blue-500', text: 'Due this week' };
    return { color: 'text-green-500', text: 'Upcoming' };
  };

  // Helper function to get file icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-5 w-5 text-purple-500" />;
      case 'zip':
      case 'rar':
        return <FileArchive className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Helper function to format description content
  const formatDescription = (description: string): string => {
    if (!description) return 'No description available.';

    // Remove HTML tags
    const stripHtml = (html: string): string => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    // Clean the description
    let cleaned = stripHtml(description);

    // Normalize line breaks and spacing
    cleaned = cleaned
      .replace(/\r\n/g, '\n') // Convert Windows line breaks
      .replace(/\r/g, '\n') // Convert Mac line breaks
      .replace(/\n\s*\n/g, '\n\n') // Normalize multiple line breaks
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();

    // Remove unnecessary line breaks within sentences
    cleaned = cleaned
      .replace(/([.!?])\s*\n\s*([a-z])/g, '$1 $2') // Join sentences broken by line breaks
      .replace(/([a-z])\s*\n\s*([a-z])/g, '$1 $2') // Join words broken by line breaks
      .replace(/([A-Z][a-z]+)\s*\n\s*([a-z])/g, '$1 $2') // Join proper nouns broken by line breaks
      .replace(/\n\s*([a-z])/g, ' $1') // Join lowercase words at line start
      .replace(/([a-z])\s*\n/g, '$1 ') // Join lowercase words at line end
      .trim();

    // Add proper spacing around common patterns (but preserve sentence flow)
    cleaned = cleaned
      .replace(/(\d+\.\s*)/g, '\n$1') // Add line break before numbered items
      .replace(/(Amendment\s+\d+)/gi, '\n$1') // Add line break before amendments
      .replace(/(\n\s*)(\d+\.\s*)/g, '\n$2') // Ensure proper spacing for numbered items
      .replace(/(\n\s*)([A-Z][a-z]+:)/g, '\n$2') // Preserve section headers
      .trim();

    // Final cleanup to ensure proper sentence spacing
    cleaned = cleaned
      .replace(/\s+([.!?])\s+/g, '$1 ') // Normalize sentence endings
      .replace(/\s+/g, ' ') // Final space normalization
      .trim();

    return cleaned;
  };

  // AI Analysis functions
  const performAIAnalysis = async () => {
    if (!content) return;

    setIsAnalyzing(true);
    try {
      console.log('Starting AI contract analysis...');

      const enhancedContent = contractDetails?.description
        ? `${content}\n\nENHANCED DESCRIPTION FROM SAM.GOV:\n${contractDetails.description}`
        : content;

      const response = await fetch('/api/contract-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: enhancedContent,
          contractTitle: contract?.title,
          contractType: contract?.type,
          analysisType: 'comprehensive',
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI analysis failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'AI analysis failed');
      }

      console.log('AI analysis completed:', {
        keyTermsCount: result.analysis.keyTerms.length,
        confidence: result.analysis.confidence,
        fallback: result.fallback || false,
      });

      setAiAnalysis(result.analysis);

      if (result.fallback) {
        console.warn(
          'Using fallback analysis - AI service may not be configured'
        );
      }
    } catch (error) {
      console.error('Error performing AI analysis:', error);
      const fallbackAnalysis: AIAnalysis = {
        keyTerms: ['contract', 'agreement', 'terms', 'conditions'],
        importantDates: [
          {
            label: 'Posted Date',
            date: contract?.postedDate || 'Not specified',
          },
          {
            label: 'Response Deadline',
            date: contract?.responseDeadLine || 'Not specified',
          },
        ],
        financialInfo: [
          { label: 'Contract Type', value: contract?.type || 'Not specified' },
          {
            label: 'Set-Aside',
            value: contract?.typeOfSetAsideDescription || 'None',
          },
        ],
        parties: contract?.fullParentPathName
          ? [{ name: contract.fullParentPathName, role: 'Contracting Agency' }]
          : [],
        risks: [
          {
            risk: 'AI analysis service not available',
            severity: 'medium',
            context: 'Please configure AI service for detailed analysis',
          },
        ],
        opportunities: [
          {
            opportunity: 'Enable AI analysis for comprehensive insights',
            impact: 'high',
            context: 'AI service would provide detailed contract analysis',
          },
        ],
        recommendations: [
          {
            recommendation: 'Configure AI analysis service',
            priority: 'high',
            context: 'AI service configuration needed for enhanced analysis',
          },
        ],
        complianceRequirements: [],
        performanceMetrics: [],
        summary:
          'Basic analysis completed. AI service is required for comprehensive contract analysis.',
        confidence: 0.3,
      };

      setAiAnalysis(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Chat function
  const handleAiChat = async () => {
    if (!aiInput.trim() || !content) return;

    setIsAiLoading(true);
    try {
      console.log('Sending AI chat request:', { question: aiInput });

      const enhancedContent = contractDetails?.description
        ? `${content}\n\nENHANCED DESCRIPTION FROM SAM.GOV:\n${contractDetails.description}`
        : content;

      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'question',
          question: aiInput,
          fileName: contract?.title || 'Contract Document',
          fileType: 'contract',
          fileContent: enhancedContent,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI chat failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.answer) {
        setAiResponse(result.answer);
        setAiInput(''); // Clear the input field after successful response
      } else {
        throw new Error(result.error || 'No response from AI');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponse(
        'Sorry, I encountered an error while analyzing your question. Please try again.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[26px] max-w-7xl max-h-[95vh] overflow-y-auto bg-white/95 backdrop-blur border border-white/40 shadow-drop-1 flex flex-col p-0">
        <DialogHeader className="px-6 py-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle className="mt-10 text-xl font-bold sidebar-gradient-text">
                  {contract.title}
                </DialogTitle>
                <div className="text-sm text-gray-600 mt-1">
                  ID: {contract.noticeId}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" className="primary-btn">
                <Star className="h-4 w-4" />
                Save
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="shadow-drop-1 primary-btn"
              >
                <Bot className="h-4 w-4" />
                AI Analysis
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 px-6 pb-6">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* Smart Summary Section */}
            <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setShowSmartSummary(!showSmartSummary)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
                    <Lightbulb className="h-5 w-5 text-cyan-600" />
                    Smart Summary
                  </CardTitle>
                  {showSmartSummary ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </CardHeader>
              {showSmartSummary && (
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aiAnalysis?.summary ||
                      `The ${
                        contract.fullParentPathName || 'Department'
                      } is seeking bids for ${
                        contract.type?.toLowerCase() || 'services'
                      } for its ${
                        contract.officeAddress?.city || 'facilities'
                      }. This contract opportunity involves ${
                        contract.typeOfSetAsideDescription
                          ? `a ${contract.typeOfSetAsideDescription.toLowerCase()}`
                          : 'competitive bidding'
                      }. The contract will be performed at ${
                        contract.officeAddress?.city || 'specified location'
                      }, ${
                        contract.officeAddress?.state || ''
                      } and requires compliance with all applicable federal regulations and requirements.`}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Description Section */}
            <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setShowMainDescription(!showMainDescription)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
                    <FileText className="h-5 w-5 text-cyan-600" />
                    Full Description
                  </CardTitle>
                  {showMainDescription ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </CardHeader>
              {showMainDescription && (
                <CardContent>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-normal">
                    {formatDescription(
                      contractDetails?.description ||
                        contract.description ||
                        'No description available.'
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 3-Column Information Grid */}
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              {/* Left Column */}
              <div className="flex-1 space-y-4">
                {/* Office */}
                <div className="flex items-center gap-3">
                  <Building className="h-10 w-10 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Office
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.fullParentPathName || 'N/A'}
                    </div>
                    {contract.officeAddress && (
                      <div className="text-sm text-gray-600">
                        {contract.officeAddress.city},{' '}
                        {contract.officeAddress.state}{' '}
                        {contract.officeAddress.zipcode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice Type */}
                <div className="flex items-center gap-3">
                  <File className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Notice Type
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.type || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* NAICS Code */}
                <div className="flex items-center gap-3">
                  <File className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      NAICS Code
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.naicsCode || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Primary Contact */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Primary Contact
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.pointOfContact?.[0]?.fullName || 'N/A'}
                    </div>
                    {contract.pointOfContact?.[0]?.email && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {contract.pointOfContact[0].email}
                      </div>
                    )}
                    {contract.pointOfContact?.[0]?.phone && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {contract.pointOfContact[0].phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden lg:block w-px bg-gray-300 self-stretch mx-3"></div>

              {/* Middle Column */}
              <div className="flex-1 space-y-4">
                {/* Buyer */}
                <div className="flex items-center gap-3">
                  <Building className="h-10 w-10 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Buyer
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.fullParentPathName || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Location
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.placeOfPerformance?.city?.name ||
                        contract.officeAddress?.city ||
                        'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.placeOfPerformance?.state?.name ||
                        contract.officeAddress?.state ||
                        'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.placeOfPerformance?.zip ||
                        contract.officeAddress?.zipcode ||
                        'N/A'}
                    </div>
                  </div>
                </div>

                {/* FPDS Code */}
                <div className="flex items-center gap-3">
                  <File className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      FPDS Code
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.classificationCode || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Set Aside */}
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-cyan-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Set Aside
                    </div>
                    <div className="text-sm text-gray-600">
                      {contract.typeOfSetAsideDescription || 'None'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden lg:block w-px bg-gray-300 self-stretch mx-3"></div>

              {/* Right Column - Timeline */}
              <div className="flex-1 space-y-4">
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[5px] top-5 bottom-5 w-0.5 h-[70px] bg-gray-300"></div>

                  <div className="space-y-6">
                    {/* Post Date */}
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 border-2 border-cyan-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          POST DATE
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {contract.postedDate
                            ? new Date(contract.postedDate).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.postedDate
                            ? getTimeAgo(contract.postedDate)
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 border-2 border-cyan-500 rounded-full mt-1 flex-shrink-0"></div>

                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          DUE DATE
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {contract.responseDeadLine
                            ? new Date(
                                contract.responseDeadLine
                              ).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        <div
                          className={`text-sm ${
                            contract.responseDeadLine
                              ? getUrgencyIndicator(contract.responseDeadLine)
                                  .color
                              : 'text-gray-500'
                          }`}
                        >
                          {contract.responseDeadLine
                            ? getUrgencyIndicator(contract.responseDeadLine)
                                .text
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            {contractDetails?.attachments &&
              contractDetails.attachments.length > 0 && (
                <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
                      <FileText className="h-5 w-5 text-cyan-600" />
                      Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contractDetails.attachments.map(
                        (
                          attachment: {
                            title: string;
                            url: string;
                            type?: string;
                          },
                          index: number
                        ) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {getFileIcon(attachment.title)}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {attachment.title}
                                </div>
                                {attachment.type && (
                                  <div className="text-xs text-gray-500">
                                    ({attachment.type})
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="shadow-drop-1 border-cyan-500 hover:border-cyan-600 focus:border-cyan-600"
                              >
                                <Bot className="h-4 w-4 mr-2" />
                                Summarize
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shadow-drop-1 border-cyan-500 hover:border-cyan-600 focus:border-cyan-600"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* AI Analysis Panel */}
          {showAiPanel && (
            <div className="w-96 border-l border-light-300 bg-light-400/30 backdrop-blur flex flex-col">
              <div className="flex justify-center flex-col p-4 border-b border-light-300 bg-white/80 backdrop-blur">
                <div className="flex items-center justify-center mb-4">
                  <h3 className="font-bold sidebar-gradient-text flex items-center gap-2">
                    <Image
                      src="/assets/images/assistant.svg"
                      alt="AI Analysis"
                      width={30}
                      height={30}
                    />
                    AI Analysis
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiPanel(false)}
                    className="shadow-drop-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {!aiAnalysis ? (
                  <Button
                    onClick={performAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full shadow-drop-1 primary-btn"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Analyze Document
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={performAIAnalysis}
                    variant="outline"
                    disabled={isAnalyzing}
                    className="!w-full shadow-drop-1 primary-btn"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Re-analyzing...
                      </>
                    ) : (
                      'Refresh Analysis'
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {aiAnalysis && (
                  <>
                    {/* Summary */}
                    <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                          <FileText className="h-4 w-4 text-cyan-600" />
                          Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">
                          {aiAnalysis.summary}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Key Terms */}
                    <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                          <Lightbulb className="h-4 w-4 text-cyan-600" />
                          Key Terms
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.keyTerms.map((term, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Important Dates */}
                    {aiAnalysis.importantDates.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Calendar className="h-4 w-4 text-cyan-600" />
                            Important Dates
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {aiAnalysis.importantDates.map((date, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-gray-600">
                                  {date.label}:
                                </span>
                                <span className="font-medium">
                                  {date.date
                                    ? new Date(date.date).toLocaleDateString()
                                    : 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Parties */}
                    {aiAnalysis.parties.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Users className="h-4 w-4 text-cyan-600" />
                            Contract Parties
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {aiAnalysis.parties.map((party, index) => (
                              <div key={index} className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {party.name}
                                </div>
                                <div className="text-gray-600">
                                  {party.role}
                                </div>
                                {party.contact && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {party.contact}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Financial Information */}
                    {aiAnalysis.financialInfo.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Target className="h-4 w-4 text-cyan-600" />
                            Financial Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {aiAnalysis.financialInfo.map((info, index) => (
                              <div key={index} className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {info.label}
                                </div>
                                <div className="text-gray-600">
                                  {info.value}
                                </div>
                                {info.context && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {info.context}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Compliance Requirements */}
                    {aiAnalysis.complianceRequirements.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Shield className="h-4 w-4 text-cyan-600" />
                            Compliance Requirements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {aiAnalysis.complianceRequirements.map(
                              (req, index) => (
                                <div key={index} className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {req.requirement}
                                  </div>
                                  <div className="text-gray-600">
                                    {req.category}
                                  </div>
                                  {req.deadline && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Deadline:{' '}
                                      {new Date(
                                        req.deadline
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Performance Metrics */}
                    {aiAnalysis.performanceMetrics.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Target className="h-4 w-4 text-cyan-600" />
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {aiAnalysis.performanceMetrics.map(
                              (metric, index) => (
                                <div key={index} className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {metric.metric}
                                  </div>
                                  {metric.target && (
                                    <div className="text-gray-600">
                                      Target: {metric.target}
                                    </div>
                                  )}
                                  {metric.frequency && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Frequency: {metric.frequency}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Risks */}
                    {aiAnalysis.risks.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <AlertTriangle className="h-4 w-4 text-cyan-600" />
                            Risks
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {aiAnalysis.risks.map((risk, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                <div className="flex items-start gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                      risk.severity === 'high'
                                        ? 'bg-red-500'
                                        : risk.severity === 'medium'
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {risk.risk}
                                    </div>
                                    {risk.context && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {risk.context}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Opportunities */}
                    {aiAnalysis.opportunities.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <CheckCircle className="h-4 w-4 text-cyan-600" />
                            Opportunities
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {aiAnalysis.opportunities.map(
                              (opportunity, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-gray-700"
                                >
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                        opportunity.impact === 'high'
                                          ? 'bg-green-500'
                                          : opportunity.impact === 'medium'
                                          ? 'bg-yellow-500'
                                          : 'bg-blue-500'
                                      }`}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {opportunity.opportunity}
                                      </div>
                                      {opportunity.context && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {opportunity.context}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {aiAnalysis.recommendations.length > 0 && (
                      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                            <Lightbulb className="h-4 w-4 text-cyan-600" />
                            Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {aiAnalysis.recommendations.map((rec, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <div className="w-1 h-1 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {rec.recommendation}
                                  </div>
                                  {rec.context && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {rec.context}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Chat */}
                    <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                          <Bot className="h-4 w-4 text-cyan-600" />
                          Ask AI
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Ask a question about this contract..."
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={handleAiChat}
                          disabled={isAiLoading || !aiInput.trim()}
                          size="sm"
                          className="!w-full shadow-drop-1 primary-btn"
                        >
                          {isAiLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Thinking...
                            </>
                          ) : (
                            'Ask AI'
                          )}
                        </Button>

                        {/* Suggested Questions */}
                        <div className="mt-4">
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-cyan-600" />
                              Quick Questions
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              'What is this contract about?',
                              'Summarize the main points',
                              'What are the key terms and conditions?',
                              'What actions do I need to take?',
                            ].map((q, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs rounded-full bg-white border-light-300 hover:bg-light-400 hover:border-[#00C1CB] focus:ring-2 focus:ring-[#078FAB] focus:outline-none transition-all duration-200 shadow-drop-1"
                                onClick={() => setAiInput(q)}
                                disabled={isAiLoading}
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {aiResponse && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border">
                            <p className="text-sm text-gray-700">
                              {aiResponse}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Generate Proposal Button */}
                    <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 sidebar-gradient-text font-semibold">
                          <FileText className="h-4 w-4 text-cyan-600" />
                          Proposal Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="sm"
                          className="!w-full shadow-drop-1 primary-btn"
                          onClick={() => {
                            // TODO: Implement proposal generation logic
                            console.log(
                              'Generate proposal for contract:',
                              contract?.noticeId
                            );
                          }}
                        >
                          Generate Proposal
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Create a professional proposal based on AI analysis
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDocumentViewer;
