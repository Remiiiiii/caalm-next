'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  ChevronUp,
  ChevronDown,
  FileText,
  Bot,
  Lightbulb,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  X,
} from 'lucide-react';
import { SAMContract } from '@/lib/sam-config';

interface ContractDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  contract: SAMContract | null;
  contractContent?: string;
}

interface AIAnalysis {
  keyTerms: string[];
  importantDates: { label: string; date: string }[];
  financialInfo: { label: string; value: string }[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  summary: string;
}

interface SearchResult {
  index: number;
  text: string;
  startPos: number;
  endPos: number;
}

const ContractDocumentViewer: React.FC<ContractDocumentViewerProps> = ({
  isOpen,
  onClose,
  contract,
  contractContent,
}) => {
  // Document state
  const [content, setContent] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // UI state
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [highlightedTerms, setHighlightedTerms] = useState<string[]>([]);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);

  // Generate document content from contract data
  useEffect(() => {
    if (contract) {
      const documentContent = generateDocumentContent(contract);
      setContent(contractContent || documentContent);
    }
  }, [contract, contractContent]);

  // Generate document content from contract object
  const generateDocumentContent = (contract: SAMContract): string => {
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

${contract.description || 'No description available.'}

ADDITIONAL INFORMATION
=====================

NAICS Code: ${contract.naicsCode || 'N/A'}
Classification Code: ${contract.classificationCode || 'N/A'}
Active Status: ${contract.active ? 'Active' : 'Inactive'}

RESOURCE LINKS
==============

${
  contract.resourceLinks
    ?.map((link) => `${link.title || 'Link'}: ${link.href}`)
    .join('\n') || 'No resource links available.'
}

---

This document contains all available information about the government contract opportunity. Please review all sections carefully and note important dates and requirements.
    `.trim();
  };

  // Search functionality
  const performSearch = useCallback(
    (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }

      const regex = new RegExp(
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi'
      );
      const matches = [];
      let match;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          index: matches.length,
          text: match[0],
          startPos: match.index,
          endPos: match.index + match[0].length,
        });
      }

      setSearchResults(matches);
      setCurrentSearchIndex(matches.length > 0 ? 0 : -1);
    },
    [content]
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, content, performSearch]);

  // Navigation functions
  const goToNextResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  const goToPrevResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(
        (prev) => (prev - 1 + searchResults.length) % searchResults.length
      );
    }
  };

  // Zoom functions
  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${contract?.title || 'Contract Document'}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1, h2, h3 { color: #333; margin-top: 30px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${contract?.title || 'Contract Document'}</h1>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="content">
              <pre>${content}</pre>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Download function
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contract?.noticeId || 'contract'}_document.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  // AI Analysis functions
  const performAIAnalysis = async () => {
    if (!content) return;

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis - in real implementation, this would call your AI service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const analysis: AIAnalysis = {
        keyTerms: [
          'Solicitation Number',
          'Response Deadline',
          'NAICS Code',
          'Set-Aside',
          'Point of Contact',
        ],
        importantDates: [
          { label: 'Posted Date', date: contract?.postedDate || '' },
          { label: 'Response Due', date: contract?.responseDeadLine || '' },
          { label: 'Archive Date', date: contract?.archiveDate || '' },
        ].filter((d) => d.date),
        financialInfo: [
          { label: 'Contract Type', value: contract?.type || 'Not specified' },
          {
            label: 'Set-Aside',
            value: contract?.typeOfSetAsideDescription || 'None',
          },
        ],
        risks: [
          'Tight response deadline',
          'Complex requirements',
          'Multiple deliverables',
        ],
        opportunities: [
          'Government contract potential',
          'Long-term partnership possibility',
          'Industry experience building',
        ],
        recommendations: [
          'Review all requirements carefully',
          'Prepare comprehensive proposal',
          'Contact POC for clarifications',
          'Ensure compliance with all regulations',
        ],
        summary:
          'This government contract opportunity requires careful attention to deadlines and compliance requirements. The scope appears well-defined with clear deliverables and contact information provided.',
      };

      setAiAnalysis(analysis);
      setHighlightedTerms(analysis.keyTerms);
    } catch (error) {
      console.error('Error performing AI analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Chat function
  const handleAiChat = async () => {
    if (!aiInput.trim()) return;

    setIsAiLoading(true);
    try {
      // Simulate AI response - in real implementation, this would call your AI service
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const responses = [
        `Based on the contract "${contract?.title}", here are the key points regarding "${aiInput}": The document shows specific requirements and deadlines that need attention.`,
        `Analyzing "${aiInput}" in this contract context: This appears to be a standard government procurement with typical compliance requirements.`,
        `Regarding "${aiInput}": The contract terms suggest this is a competitive opportunity with clear evaluation criteria.`,
      ];

      setAiResponse(responses[Math.floor(Math.random() * responses.length)]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponse(
        'Sorry, I encountered an error while analyzing your question.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // Highlight text with search results and AI terms
  const getHighlightedContent = useMemo(() => {
    let highlightedContent = content;

    // Highlight search results
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      searchResults.forEach((result, index) => {
        const isActive = index === currentSearchIndex;
        const className = isActive
          ? 'bg-yellow-300 font-bold'
          : 'bg-yellow-100';
        const replacement = `<mark class="${className}">${result.text}</mark>`;

        // Use a placeholder to avoid conflicts
        highlightedContent = highlightedContent.replace(
          new RegExp(result.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          replacement
        );
      });
    }

    // Highlight AI terms
    highlightedTerms.forEach((term) => {
      if (
        !searchTerm ||
        !term.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        const regex = new RegExp(
          `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'gi'
        );
        highlightedContent = highlightedContent.replace(
          regex,
          `<span class="bg-blue-100 border-b-2 border-blue-300 font-medium">$&</span>`
        );
      }
    });

    return highlightedContent;
  }, [
    content,
    searchResults,
    currentSearchIndex,
    highlightedTerms,
    searchTerm,
  ]);

  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6" />
            {contract.title}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            {contract.noticeId} • {contract.officeAddress?.city},{' '}
            {contract.officeAddress?.state}
          </p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
              {/* Search */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search document..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">
                      {currentSearchIndex + 1} of {searchResults.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevResult}
                      disabled={searchResults.length === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextResult}
                      disabled={searchResults.length === 0}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Actions */}
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* AI Analysis Toggle */}
              <Button
                variant={showAiPanel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowAiPanel(!showAiPanel)}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Analysis
              </Button>
            </div>

            {/* Document Content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-auto p-6 bg-white"
              style={{ fontSize: `${zoom}%` }}
            >
              <div
                className="whitespace-pre-wrap font-mono leading-relaxed"
                dangerouslySetInnerHTML={{ __html: getHighlightedContent }}
              />
            </div>
          </div>

          {/* AI Analysis Panel */}
          {showAiPanel && (
            <div className="w-96 border-l bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Analysis
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {!aiAnalysis ? (
                  <Button
                    onClick={performAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full"
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
                    className="w-full"
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
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
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
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
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
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
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

                    {/* Risks */}
                    {aiAnalysis.risks.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Risks
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {aiAnalysis.risks.map((risk, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <div className="w-1 h-1 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Opportunities */}
                    {aiAnalysis.opportunities.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Opportunities
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {aiAnalysis.opportunities.map(
                              (opportunity, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-gray-700 flex items-start gap-2"
                                >
                                  <div className="w-1 h-1 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                                  {opportunity}
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {aiAnalysis.recommendations.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-500" />
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
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Chat */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Bot className="h-4 w-4" />
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
                          className="w-full"
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
                        {aiResponse && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border">
                            <p className="text-sm text-gray-700">
                              {aiResponse}
                            </p>
                          </div>
                        )}
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
