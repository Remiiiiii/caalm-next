import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Download,
  Share2,
  FileText,
  Calendar,
  // User,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import Image from 'next/image';
//import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
//import { Separator } from './ui/separator';

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

  const [aiSuggestedQuestions, setAiSuggestedQuestions] = useState<string[]>(
    []
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  //const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all AI state when DocumentViewer opens or file changes
  useEffect(() => {
    if (isOpen) {
      setAiSuggestedQuestions([]);
      setChatMessages([]);
      setNewMessage('');
      setIsLoading(false);
      setAiLoading(false);
    }
  }, [isOpen, file.id]);

  // Fetch file content and analyze document on open
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    const fetchFileContent = async () => {
      if (
        ['txt', 'md', 'json', 'xml', 'html', 'js', 'ts'].includes(
          file.type.toLowerCase()
        )
      ) {
        setContentLoading(true);
        try {
          const response = await fetch(file.url);
          const content = await response.text();
          if (!ignore) {
            setFileContent(content);
          }
        } catch (error) {
          console.error('Error fetching file content:', error);
          if (!ignore) {
            setFileContent('Error loading file content');
          }
        } finally {
          if (!ignore) {
            setContentLoading(false);
          }
        }
      }
    };

    const analyze = async () => {
      setAiLoading(true);
      setAiSuggestedQuestions([]);
      // Always start with the greeting message
      setChatMessages([
        {
          id: 'greeting',
          text: "Hi! I'm your document assistant. I can help you understand and analyze this document. What would you like to know about it?",
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);

      try {
        const response = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'analyze',
            fileName: file.name,
            fileType: file.type,
            fileUrl: file.url,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const analysis = await response.json();
        if (ignore) return;

        setAiSuggestedQuestions(analysis.suggestedQuestions);
        setAiLoading(false);
      } catch (error) {
        console.error('AI Analysis failed:', error);
        if (ignore) return;
        setAiLoading(false);
      }
    };

    // Fetch content and analyze
    fetchFileContent();
    analyze();

    return () => {
      ignore = true;
    };
  }, [isOpen, file]);

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
  }, [file.url]);

  const handleSendMessage = async (msg?: string) => {
    const message = msg || newMessage;
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
          fileUrl: file.url,
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
          text: ai.answer,
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
      handleSendMessage();
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
                <code>{fileContent || 'No content available'}</code>
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

  if (!isOpen) return null;

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
              <h2 className="text-xl font-semibold text-gray-900">
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
              className="border-light-300 hover:border-[#00C1CB] hover:bg-light-400 transition-all duration-200"
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
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-light-300 hover:border-[#00C1CB] hover:bg-light-400 transition-all duration-200"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-light-300 hover:border-[#00C1CB] hover:bg-light-400 transition-all duration-200"
              onClick={() => {
                setIsClosing(true);
                onClose();
              }}
              style={{
                pointerEvents: 'auto',
              }}
            >
              <X className="w-4 h-4" />
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

          {/* Chat Interface */}
          <div
            className="w-1/3 flex flex-col bg-light-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable Content */}
            <ScrollArea className="flex-1" onClick={(e) => e.stopPropagation()}>
              <div className="p-4" onClick={(e) => e.stopPropagation()}>
                {/* Loading State */}
                {aiLoading && (
                  <div className="flex justify-start mb-6">
                    <div className="flex items-start space-x-3 max-w-[85%]">
                      <div className="flex-shrink-0">
                        <Image
                          src="/assets/images/logo.svg"
                          alt="AI Assistant"
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full bg-blue-100 p-1"
                        />
                      </div>
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="space-y-6">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      {message.sender === 'assistant' && (
                        <div className="flex items-start space-x-3 max-w-[95%]">
                          <div className="flex-shrink-0">
                            <Image
                              src="/assets/images/logo.svg"
                              alt="AI Assistant"
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full bg-blue-100 p-1"
                            />
                          </div>
                          <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {message.text}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {message.sender === 'user' && (
                        <div className="bg-gradient-to-r from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] text-white rounded-2xl px-4 py-3 max-w-[85%] shadow-drop-1">
                          <p className="text-sm whitespace-pre-line">
                            {message.text}
                          </p>
                          <p className="text-xs text-blue-100 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3 max-w-[85%]">
                        <div className="flex-shrink-0">
                          <Image
                            src="/assets/images/logo.svg"
                            alt="AI Assistant"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full bg-blue-100 p-1"
                          />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="mt-8 pt-4 border-t border-light-300">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Ask about this document..."
                      className="flex-1 bg-white rounded-full border-none px-4 py-2 shadow-drop-1 focus:border-[#00C1CB] focus:ring-1 focus:ring-[#00C1CB] focus:outline-none transition-all duration-200"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendMessage();
                      }}
                      disabled={!newMessage.trim() || isLoading}
                      className="bg-gradient-to-r from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] hover:from-[#078FAB] hover:via-[#0E638F] hover:via-[#11487D] hover:via-[#162768] hover:to-[#00C1CB] text-white rounded-full p-2 shadow-drop-1 transition-all duration-300"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Suggested Questions */}
                  {aiSuggestedQuestions.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestedQuestions.slice(0, 4).map((q, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-full bg-white border-light-300 hover:bg-light-400 hover:border-[#00C1CB] focus:ring-2 focus:ring-[#078FAB] focus:outline-none transition-all duration-200 shadow-drop-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendMessage(q);
                            }}
                            disabled={isLoading}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
