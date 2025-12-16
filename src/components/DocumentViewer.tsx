import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDocumentViewer } from '@/hooks/useDocumentViewer';
import {
  X,
  Send,
  Download,
  Share2,
  FileText,
  Calendar,
  Lightbulb,
  Users,
  Target,
  Shield,
  Bot,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Minimize2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import { formatAIResponse } from '@/lib/utils/aiResponseFormatter';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    type: string;
    size: string;
    url: string;
    createdAt: string;
    expiresAt?: string;
    createdBy: string;
    description?: string;
  };
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [welcomeMessageLoaded, setWelcomeMessageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Use SWR hook for document data
  const {
    fileContent,
    contentLoading,
    analysisLoading: aiLoading,
    extractText,
    analyzeWithAI,
    refreshAll,
  } = useDocumentViewer(file?.id || '');

  // Debug logging for file.id
  useEffect(() => {
    console.log('DocumentViewer file.id:', file?.id, 'type:', typeof file?.id);
  }, [file?.id]);

  // Reset all AI state when DocumentViewer opens or file changes
  useEffect(() => {
    if (isOpen) {
      setChatMessages([]);
      setNewMessage('');
      setIsLoading(false);
      setShowUploadPrompt(false);
      setWelcomeMessageLoaded(false);
    }
  }, [isOpen, file.id]);

  // Trigger file content extraction and AI analysis when document viewer opens
  useEffect(() => {
    if (!isOpen) return;

    const fileType = file.type.toLowerCase();

    // Check if it's a local file (file:// URL or blob URL)
    if (
      file.url.startsWith('file://') ||
      file.url.startsWith('blob:') ||
      file.url.startsWith('data:')
    ) {
      console.log('Detected local file URL, cannot fetch directly:', file.url);
      setShowUploadPrompt(true);
      return;
    }

    // Extract text content for text files and PDFs
    if (
      ['txt', 'md', 'json', 'xml', 'html', 'js', 'ts', 'pdf'].includes(
        fileType
      ) &&
      extractText &&
      file.id &&
      file.name
    ) {
      console.log('Extracting text content for file:', {
        id: file.id,
        name: file.name,
        type: file.type,
        url: file.url,
        isLocalFile:
          file.url.startsWith('file://') ||
          file.url.startsWith('blob:') ||
          file.url.startsWith('data:'),
        isPdf: file.type.toLowerCase() === 'pdf',
      });
      extractText();
    }
  }, [isOpen, file.id, file.url, file.type, file.name, extractText]);

  useEffect(() => {
    // Only scroll to bottom when new messages are added (not on initial load)
    if (chatEndRef.current && chatMessages.length > 1) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    // Reset preview state when document changes
    setPreviewError(null);
    setIsPreviewLoading(true);
  }, [file.url, file.name]);

  const analyze = useCallback(async () => {
    // Always start with the greeting message
    setChatMessages([
      {
        id: 'greeting',
        text: "Hi! I'm your document assistant. I can help you understand and analyze this document. What would you like to know about it?",
        sender: 'assistant',
        timestamp: new Date(),
      },
    ]);
    setWelcomeMessageLoaded(true);

    try {
      // Use SWR hook to analyze the document
      await analyzeWithAI();
    } catch (error) {
      console.error('AI Analysis failed:', error);
    }
  }, [analyzeWithAI]);

  // Initialize with welcome message and suggested questions when component opens
  useEffect(() => {
    if (isOpen && !welcomeMessageLoaded && chatMessages.length === 0) {
      analyze();
    }
  }, [isOpen, welcomeMessageLoaded, chatMessages.length, analyze]);

  const handleSendMessage = async ({
    message: overrideMessage,
  }: { message?: string } = {}) => {
    const message = overrideMessage || newMessage;
    if (!message.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // For PDFs, use the extracted content if available
      const contentToAnalyze = fileContent;
      let urlToUse = file.url;

      // If it's a local PDF and we have extracted content, use that
      if (
        file.type.toLowerCase() === 'pdf' &&
        file.url.startsWith('file://') &&
        fileContent
      ) {
        urlToUse = ''; // Don't pass the file:// URL to the AI API
      }

      console.log('Sending AI question request:', {
        action: 'question',
        question: message,
        fileName: file.name,
        fileType: file.type,
        fileUrl: urlToUse,
        hasFileContent: !!contentToAnalyze,
        fileContentLength: contentToAnalyze?.content?.length || 0,
      });

      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'question',
          question: message,
          fileName: file.name,
          fileType: file.type,
          fileUrl: urlToUse,
          fileContent: contentToAnalyze,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ai = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-ai',
          text: formatAIResponse(ai.answer),
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('AI Question failed:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-ai-error',
          text: "I'm sorry, I encountered an error while processing your question. Please try again.",
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage({ message: undefined });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update the file content using SWR
        await refreshAll();
        setShowUploadPrompt(false);
        console.log('PDF uploaded and text extracted successfully');
        console.log('Extracted text length:', result.text?.length || 0);

        // Trigger AI analysis after successful upload
        setTimeout(() => {
          analyze();
        }, 100);
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📈';
      case 'txt':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isImageFile = (type: string) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    return imageTypes.includes(type.toLowerCase());
  };

  const isPdfFile = (type: string) => {
    return type.toLowerCase() === 'pdf';
  };

  const isTextFile = (type: string) => {
    const textTypes = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'];
    return textTypes.includes(type.toLowerCase());
  };

  const renderFilePreview = () => {
    const fileType = file.type.toLowerCase();

    if (isImageFile(fileType)) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          {isPreviewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading image...</p>
              </div>
            </div>
          )}
          <Image
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onLoad={() => setIsPreviewLoading(false)}
            onError={() => {
              setPreviewError('Failed to load image');
              setIsPreviewLoading(false);
            }}
          />
        </div>
      );
    }

    if (isPdfFile(fileType)) {
      // Show upload prompt for local files
      if (
        showUploadPrompt ||
        file.url.startsWith('file://') ||
        file.url.startsWith('blob:') ||
        file.url.startsWith('data:')
      ) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Local PDF Detected
              </h3>
              <p className="text-gray-500 mb-6">
                To enable AI analysis, please upload this PDF file to the
                server.
              </p>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload PDF for AI Analysis'}
                </Button>
                <p className="text-xs text-gray-400">
                  Your file will be processed securely and text will be
                  extracted for AI analysis.
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col">
          {isPreviewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading PDF...</p>
              </div>
            </div>
          )}
          <div className="flex-1">
            <iframe
              src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-0"
              title={file.name}
              onLoad={() => setIsPreviewLoading(false)}
              onError={() => {
                setPreviewError('Failed to load PDF');
                setIsPreviewLoading(false);
              }}
            />
          </div>
        </div>
      );
    }

    if (isTextFile(fileType)) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 p-4 overflow-auto">
            {contentLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">
                    Loading file content...
                  </p>
                </div>
              </div>
            ) : (
              <pre className="text-sm text-gray-800 bg-white p-4 rounded-lg h-full overflow-auto border">
                <code>{fileContent?.content || 'No content available'}</code>
              </pre>
            )}
          </div>
        </div>
      );
    }

    // For other file types, show a preview with download option
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">{getFileIcon(file.type)}</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {file.name}
          </h3>
          <p className="text-gray-500 mb-4">
            {file.description || 'Preview not available for this file type'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isOpen && !isClosing) {
                  window.open(file.url, '_blank');
                }
              }}
              disabled={isClosing}
            >
              Open Full Document
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isOpen && !isClosing) {
                  const link = document.createElement('a');
                  link.href = file.url;
                  link.download = file.name;
                  link.click();
                }
              }}
              disabled={isClosing}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen || !file || !file.id) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();

        if (e.target === e.currentTarget && !isClosing) {
          setIsClosing(true);
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-drop-2 w-full max-w-7xl h-[90vh] flex flex-col border border-light-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rounded-3xl flex items-center justify-between p-6 border-b border-light-300 bg-gradient-to-r from-light-400 to-white">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">{getFileIcon(file.type)}</div>
            <div>
              <h2 className="text-xl font-semibold sidebar-gradient-text">
                {file.name}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {file.type.toUpperCase()}
                </span>
                <span>{file.size}</span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(file.createdAt)}
                </span>
                {file.expiresAt && (
                  <Badge variant="destructive">
                    Expires: {formatDate(file.expiresAt)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="primary-btn px-3 sm:px-4"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen && !isClosing) {
                  const link = document.createElement('a');
                  link.href = file.url;
                  link.download = file.name;
                  link.click();
                }
              }}
              disabled={isClosing}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="primary-btn px-3 sm:px-4"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="primary-btn px-3 sm:px-4"
              onClick={() => {
                setIsClosing(true);
                onClose();
              }}
              style={{
                pointerEvents: 'auto',
              }}
            >
              <Minimize2 className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="rounded-3xl flex-1 flex overflow-hidden">
          {/* Document Preview */}
          <div className="w-2/3 border-r border-light-300 bg-light-400 relative">
            {previewError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-500 mb-2">{previewError}</div>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isOpen && !isClosing) {
                        window.open(file.url, '_blank');
                      }
                    }}
                    disabled={isClosing}
                  >
                    Open Full Document
                  </Button>
                </div>
              </div>
            ) : (
              renderFilePreview()
            )}
          </div>

          {/* AI Analysis Panel */}
          <div
            className="w-1/3 border-l border-light-300 bg-light-400/30 backdrop-blur flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-center flex-col p-4 border-b border-light-300 bg-white/80 backdrop-blur">
              <div className="flex items-center justify-center mb-4">
                <h3 className="font-bold sidebar-gradient-text flex items-center gap-2">
                  <Image
                    src="/assets/images/assistant.svg"
                    alt="AI Assistant"
                    width={30}
                    height={30}
                  />
                  AI Assistant
                </h3>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1" onClick={(e) => e.stopPropagation()}>
              <div
                className="p-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Welcome Message - Display greeting from analyze function */}
                {chatMessages.length > 0 &&
                  chatMessages[0].sender === 'assistant' && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3 max-w-[95%]">
                        <div className="flex-shrink-0">
                          <Image
                            src="/assets/images/assistant.svg"
                            alt="AI Assistant"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full bg-blue-100 p-1"
                          />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {chatMessages[0].text}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {chatMessages[0].timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Document Information Cards */}
                {/* Summary */}
                {file.description && (
                  <Card className="bg-white border border-slate-200 shadow-sm rounded-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-900">
                        <FileText className="h-4 w-4 text-cyan-600" />
                        Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700">
                        {file.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Important Dates */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-900">
                      <Calendar className="h-4 w-4 text-cyan-600" />
                      Important Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(file.createdAt)}
                        </span>
                      </div>
                      {file.expiresAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(file.expiresAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Document Information */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-900">
                      <FileText className="h-4 w-4 text-cyan-600" />
                      Document Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File Type:</span>
                        <span className="font-medium text-gray-900">
                          {file.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium text-gray-900">
                          {file.size}
                        </span>
                      </div>
                      {file.createdBy && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Created By:</span>
                          <span className="font-medium text-gray-900">
                            {file.createdBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

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
                        placeholder="Ask a question about this document..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendMessage({ message: undefined });
                      }}
                      disabled={!newMessage.trim() || isLoading}
                      size="sm"
                      className="!w-full shadow-drop-1 primary-btn"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Thinking...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Ask AI
                        </>
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
                          'What is this document about?',
                          'When does this contract expire?',
                          'What are the key terms and conditions?',
                          'What actions do I need to take?',
                        ].map((q, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-full bg-white border-light-300 hover:bg-light-400 hover:border-[#00C1CB] focus:ring-2 focus:ring-[#078FAB] focus:outline-none transition-all duration-200 shadow-drop-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendMessage({ message: q });
                            }}
                            disabled={isLoading}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Messages Display - Exclude greeting message shown at top */}
                    {chatMessages.length > 1 && (
                      <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                        {chatMessages
                          .filter((message) => message.id !== 'greeting')
                          .map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.sender === 'user'
                                  ? 'bg-gradient-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] text-white'
                                  : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-line">
                                {message.text}
                              </p>
                              <p
                                className={`text-xs mt-2 ${
                                  message.sender === 'user'
                                    ? 'text-blue-100'
                                    : 'text-gray-400'
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        {isLoading && (
                          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                            <span className="text-sm text-gray-600">
                              Thinking...
                            </span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
