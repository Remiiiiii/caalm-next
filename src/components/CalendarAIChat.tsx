'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Loader2,
  FileText,
  Paperclip,
  MessageSquare,
  Calendar,
  Users,
  Clock,
  Minimize2,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface CalendarAIChatProps {
  mode: 'pre-reads' | 'chat';
  event: {
    title: string;
    startDate: string | Date;
    endDate?: string | Date;
    startTime?: string;
    endTime?: string;
    description?: string;
    participants?: string;
    type?: string;
    contractName?: string;
  } | null;
  contractData?: {
    title?: string;
    description?: string;
    noticeId?: string;
    content?: string;
  } | null;
  onClose?: () => void;
}

const CalendarAIChat: React.FC<CalendarAIChatProps> = ({
  mode,
  event,
  contractData,
  onClose,
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [welcomeMessageLoaded, setWelcomeMessageLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  // Reset messages when mode or event changes
  useEffect(() => {
    setChatMessages([]);
    setAiInput('');
    setIsAiLoading(false);
    setWelcomeMessageLoaded(false);
  }, [mode, event?.title]);

  // Auto-send pre-reads prompt when mode is 'pre-reads' and contract data is available
  useEffect(() => {
    if (
      mode === 'pre-reads' &&
      contractData &&
      chatMessages.length === 0 &&
      !isAiLoading &&
      !welcomeMessageLoaded
    ) {
      const preReadsPrompt = `Recommend top pre-reads for this contract review meeting so that I can contribute effectively. Analyze the contract content and provide specific recommendations. Include:
- Key sections to review
- Important terms and conditions to understand
- Relevant background information
- Questions to prepare for the meeting

Meeting: ${event?.title || 'Contract Review'}
Contract: ${contractData.title || contractData.noticeId || 'Contract'}`;

      handleSendMessage(preReadsPrompt, true);
      setWelcomeMessageLoaded(true);
    }
  }, [
    mode,
    contractData,
    event,
    chatMessages.length,
    isAiLoading,
    welcomeMessageLoaded,
  ]);

  // Build context for AI requests
  const buildContext = (): string => {
    let context = '';

    if (event) {
      context += `EVENT CONTEXT:\n`;
      context += `Title: ${event.title}\n`;
      if (event.startDate) {
        const date = new Date(event.startDate);
        context += `Date: ${format(date, 'EEEE, MMMM d, yyyy')}\n`;
      }
      if (event.startTime && event.endTime) {
        context += `Time: ${event.startTime} - ${event.endTime}\n`;
      }
      if (event.description) {
        context += `Description: ${event.description}\n`;
      }
      if (event.participants) {
        context += `Participants: ${event.participants}\n`;
      }
      context += `\n`;
    }

    if (contractData && mode === 'pre-reads') {
      context += `CONTRACT INFORMATION:\n`;
      context += `Title: ${contractData.title || 'N/A'}\n`;
      if (contractData.noticeId) {
        context += `Notice ID: ${contractData.noticeId}\n`;
      }
      if (contractData.description) {
        context += `Description: ${contractData.description.substring(
          0,
          2000
        )}\n`;
      }
      if (contractData.content) {
        context += `\nContract Content:\n${contractData.content.substring(
          0,
          3000
        )}\n`;
      }
    }

    return context;
  };

  // Send message to AI
  const handleSendMessage = async (messageText?: string, autoSend = false) => {
    const textToSend = messageText || aiInput.trim();
    if (!textToSend) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!autoSend) {
      setAiInput('');
    }
    setIsAiLoading(true);

    try {
      const context = buildContext();
      const fileContent =
        contractData?.content || contractData?.description || context;
      const fileName =
        mode === 'pre-reads'
          ? contractData?.title || event?.title || 'Contract Review'
          : event?.title || 'Meeting';

      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'question',
          question: textToSend,
          fileName: fileName,
          fileType: mode === 'pre-reads' ? 'contract' : 'meeting',
          fileContent: context + (fileContent ? `\n\n${fileContent}` : ''),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI chat failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.answer) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          text: result.answer,
          sender: 'assistant',
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(result.error || 'No response from AI');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle suggested actions for chat mode
  const handleSuggestedAction = (action: string) => {
    setAiInput(action);
    handleSendMessage(action);
  };

  // Get suggested questions based on mode
  const getSuggestedQuestions = (): string[] => {
    if (mode === 'pre-reads') {
      return [
        'What are the key terms I should focus on?',
        'What are potential risks in this contract?',
        'What questions should I ask during the review?',
        'What are the compliance requirements?',
      ];
    } else {
      return [
        'Help me draft a message to the organizer.',
        'What questions should I ask during the meeting?',
        'How to quickly review shared documents?',
        'What should be included in the agenda?',
      ];
    }
  };

  return (
    <div className="flex flex-col h-full bg-light-400/30 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-light-300 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/images/assistant.svg"
            alt="AI Assistant"
            width={30}
            height={30}
          />
          <h3 className="font-bold sidebar-gradient-text">
            {mode === 'pre-reads'
              ? 'Pre-Reads Recommendations'
              : 'AI Assistant'}
          </h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shadow-drop-1"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Welcome message for chat mode */}
          {mode === 'chat' &&
            chatMessages.length === 0 &&
            !isAiLoading &&
            !welcomeMessageLoaded && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[95%]">
                  <div className="flex-shrink-0">
                    <Image
                      src="/assets/images/assistant.svg"
                      alt="AI Assistant"
                      width={54}
                      height={54}
                      className="w-12 h-12 rounded-full bg-blue-100 p-1"
                    />
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                    <div className="text-sm text-gray-700 space-y-2">
                      {event ? (
                        <>
                          <p>
                            It looks like you&apos;re referring to a calendar
                            event titled &quot;{event.title}&quot; scheduled for{' '}
                            {event.startDate &&
                              format(
                                new Date(event.startDate),
                                'EEEE, MMMM d, yyyy'
                              )}
                            {event.startTime && ` at ${event.startTime}`}.
                          </p>
                          {event.description ? (
                            <p>
                              However, I don&apos;t have direct access to your
                              calendar details like the event description,
                              attendees, or location unless you share them with
                              me.
                            </p>
                          ) : (
                            <p>
                              However, I don&apos;t have direct access to your
                              calendar details like the event description,
                              attendees, or location unless you share them with
                              me.
                            </p>
                          )}
                          <p>
                            Would you like help drafting an agenda, preparing
                            questions, or summarizing the meeting afterward?
                          </p>
                        </>
                      ) : (
                        <p>
                          Hi! I&apos;m your meeting assistant. I can help you
                          prepare for meetings, draft agendas, and prepare
                          questions. What would you like help with?
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Chat messages */}
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'assistant' && (
                <div className="flex items-start space-x-3 max-w-[95%]">
                  <div className="flex-shrink-0">
                    <Image
                      src="/assets/images/assistant.svg"
                      alt="AI Assistant"
                      width={54}
                      height={54}
                      className="w-12 h-12 rounded-full bg-blue-100 p-1"
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
                <div className="bg-gradient-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] text-white rounded-2xl px-4 py-3 max-w-[85%] shadow-drop-1">
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className="text-xs text-blue-100 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isAiLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-[85%]">
                <div className="flex-shrink-0">
                  <Image
                    src="/assets/images/assistant.svg"
                    alt="AI Assistant"
                    width={54}
                    height={54}
                    className="w-12 h-12 rounded-full bg-blue-100 p-1"
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
      </ScrollArea>

      {/* Suggested Actions (for chat mode) */}
      {mode === 'chat' &&
        chatMessages.length === 0 &&
        !isAiLoading &&
        !welcomeMessageLoaded && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {[
                'Help me draft a message to the organizer.',
                'What questions should I ask during the meeting?',
                'How to quickly review shared documents?',
              ].map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3 bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-sm"
                  onClick={() => handleSuggestedAction(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

      {/* Input Area */}
      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur m-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Textarea
              placeholder={
                mode === 'pre-reads'
                  ? 'Ask about contract details...'
                  : 'Message AI Assistant...'
              }
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="text-sm"
              rows={2}
            />
          </div>
          <Button
            onClick={() => handleSendMessage()}
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
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>

          {/* Suggested Questions */}
          {chatMessages.length > 0 && (
            <div className="mt-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  Quick Questions
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {getSuggestedQuestions().map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full bg-white border-light-300 hover:bg-light-400 hover:border-[#00C1CB] focus:ring-2 focus:ring-[#078FAB] focus:outline-none transition-all duration-200 shadow-drop-1"
                    onClick={() => handleSuggestedAction(q)}
                    disabled={isAiLoading}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarAIChat;
