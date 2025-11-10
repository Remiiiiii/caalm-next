'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  FileText,
  MessageSquare,
  Minimize2,
  Copy,
  Check,
  NotebookPen,
  HelpCircle,
  ClipboardList,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface EventAttachment {
  $id: string;
  name: string;
  url: string;
  type: string;
  extension: string;
  size: number;
  bucketFileId?: string;
}

type AttachmentLike = (EventAttachment & { fileId?: string; id?: string }) | string;

const isAttachmentObject = (
  attachment: AttachmentLike
): attachment is EventAttachment & { fileId?: string; id?: string } =>
  typeof attachment !== 'string';

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
    createdBy?: string;
    attachments?: Array<EventAttachment | string>;
  } | null;
  contractData?: {
    title?: string;
    description?: string;
    noticeId?: string;
    content?: string;
  } | null;
  isContractLoading?: boolean;
  onClose?: () => void;
}

const RECOMMENDED_ACTIONS = {
  chat: [
    {
      title: 'Draft a message',
      description:
        'Craft a polished note that references meeting context and attachments.',
      value: 'Help me draft a message to the organizer.',
      icon: NotebookPen,
    },
    {
      title: 'Plan questions',
      description:
        'Uncover meeting-specific questions to keep the discussion focused.',
      value: 'What questions should I ask during the meeting?',
      icon: HelpCircle,
    },
    {
      title: 'Review pre-work',
      description:
        'Get a clear checklist of documents or tasks to prepare beforehand.',
      value: 'What should I prepare before this meeting?',
      icon: ClipboardList,
    },
  ],
  'pre-reads': [
    {
      title: 'Summarize attachments',
      description: 'Condense the key points in the attached documents.',
      value: 'Summarize the attached documents.',
      icon: FileText,
    },
    {
      title: 'Extract action items',
      description:
        'Highlight action items or follow-ups I should track after the meeting.',
      value: 'List action items from the pre-reads.',
      icon: ClipboardList,
    },
    {
      title: 'Identify risks',
      description:
        'Point out potential risks or concerns the team should be aware of.',
      value: 'Are there any risks noted in the documents?',
      icon: AlertTriangle,
    },
  ],
} as const;

const CalendarAIChat: React.FC<CalendarAIChatProps> = ({
  mode,
  event,
  contractData,
  isContractLoading = false,
  onClose,
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [welcomeMessageLoaded, setWelcomeMessageLoaded] = useState(false);
  const [preReadsPromptSent, setPreReadsPromptSent] = useState(false);
  const lastPreReadsPromptKeyRef = useRef<string | null>(null);
  const autoPromptPendingRef = useRef(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [organizerInfo, setOrganizerInfo] = useState<{
    name?: string;
    email?: string;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copy message to clipboard
  const handleCopyMessage = async (messageId: string, messageText: string) => {
    try {
      // Strip HTML tags and decode HTML entities for clean plain text copying
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formatAIResponse(messageText);
      const textToCopy =
        tempDiv.textContent ||
        tempDiv.innerText ||
        messageText.replace(/<[^>]*>/g, '');

      await navigator.clipboard.writeText(textToCopy.trim());
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Format AI response text: convert markdown to HTML with proper formatting
  const formatAIResponse = (text: string): string => {
    if (!text) return '';

    let formatted = text;

    // First, handle section headers like "**Key Sections to Review:**" before processing other content
    formatted = formatted.replace(
      /^\*\*([^*]+?)\*\*:?\s*$/gm,
      '<strong class="block mb-3 mt-5 text-base font-semibold sidebar-gradient-text">$1</strong>'
    );

    // Split by double line breaks first to handle sections
    const sections = formatted.split(/\n\n+/);
    const formattedSections = sections.map((section) => {
      let sectionText = section.trim();
      if (!sectionText) return '';

      // Handle bullet points with proper indentation
      // Match lines that start with "- " or "* " (but not if they're part of bold)
      sectionText = sectionText.replace(
        /^([-*])\s+(.+)$/gm,
        (match, bullet, content) => {
          // Check if it's nested (starts with spaces or tabs before the bullet)
          const isNested = /^\s{2,}/.test(match);
          const indent = isNested ? 'ml-8' : 'ml-4';

          // Process bold text within the content (for inline bold like "**Title:**")
          let processedContent = content
            .replace(
              /\*\*([^*]+?)\*\*/g,
              '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
            )
            .replace(
              /__([^_]+?)__/g,
              '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
            );

          // Process italic text
          processedContent = processedContent
            .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
            .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

          return `<div class="${indent} mb-2 flex items-start"><span class="mr-2 text-gray-600 flex-shrink-0">•</span><span class="flex-1">${processedContent.trim()}</span></div>`;
        }
      );

      // Handle numbered lists (1. 2. etc.)
      sectionText = sectionText.replace(
        /^(\d+\.)\s+(.+)$/gm,
        (match, number, content) => {
          const isNested = /^\s{2,}/.test(match);
          const indent = isNested ? 'ml-8' : 'ml-4';

          // Process bold and italic within content
          let processedContent = content
            .replace(
              /\*\*([^*]+?)\*\*/g,
              '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
            )
            .replace(
              /__([^_]+?)__/g,
              '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
            );

          processedContent = processedContent
            .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
            .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

          return `<div class="${indent} mb-2 flex items-start"><span class="mr-2 font-semibold text-gray-700 flex-shrink-0">${number}</span><span class="flex-1">${processedContent.trim()}</span></div>`;
        }
      );

      // Process any remaining bold text in regular paragraphs (not in lists)
      sectionText = sectionText.replace(
        /\*\*([^*]+?)\*\*/g,
        '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
      );
      sectionText = sectionText.replace(
        /__([^_]+?)__/g,
        '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
      );

      // Process italic text
      sectionText = sectionText.replace(
        /(?<!\*)\*([^*]+?)\*(?!\*)/g,
        '<em>$1</em>'
      );
      sectionText = sectionText.replace(
        /(?<!_)_([^_]+?)_(?!_)/g,
        '<em>$1</em>'
      );

      // Convert remaining single line breaks to <br> but preserve list structure
      sectionText = sectionText.replace(/\n(?!<div)/g, '<br />');

      return sectionText;
    });

    // Join sections with proper spacing
    formatted = formattedSections
      .filter((s) => s.trim())
      .map((section) => `<div class="mb-4 leading-relaxed">${section}</div>`)
      .join('');

    // Clean up any empty divs
    formatted = formatted.replace(
      /<div class="mb-4 leading-relaxed"><\/div>/g,
      ''
    );

    // Process any remaining bold text in regular paragraphs (not already processed)
    formatted = formatted.replace(
      /\*\*([^*]+?)\*\*/g,
      '<strong class="font-semibold sidebar-gradient-text">$1</strong>'
    );

    // Process any remaining italic text
    formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');

    return formatted;
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  // Fetch organizer information when event changes
  useEffect(() => {
    const fetchOrganizerInfo = async () => {
      if (event?.createdBy && event.createdBy !== 'outlook-sync') {
        try {
          const response = await fetch(`/api/users/get-by-ids`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: [event.createdBy] }),
          });

          if (response.ok) {
            const users = await response.json();
            if (users.length > 0) {
              setOrganizerInfo({
                name: users[0].fullName,
                email: users[0].email,
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch organizer info:', error);
        }
      } else {
        setOrganizerInfo(null);
      }
    };

    fetchOrganizerInfo();
  }, [event?.createdBy]);

  // Reset messages when mode or event changes
  useEffect(() => {
    setChatMessages([]);
    setAiInput('');
    setIsAiLoading(false);
    setWelcomeMessageLoaded(false);
    setPreReadsPromptSent(false);
    lastPreReadsPromptKeyRef.current = null;
  }, [mode, event?.title]);

  // Auto-send pre-reads prompt when entering pre-read mode
  useEffect(() => {
    if (
      mode !== 'pre-reads' ||
      chatMessages.length > 0 ||
      isAiLoading ||
      autoPromptPendingRef.current
    ) {
      return;
    }

    const meetingTitle = event?.title || 'Contract Review';
    const contractTitle =
      contractData?.title ||
      contractData?.noticeId ||
      meetingTitle ||
      'Contract';

    const promptKey = `${mode}-${meetingTitle}`;

    if (lastPreReadsPromptKeyRef.current === promptKey) {
      return;
    }

    lastPreReadsPromptKeyRef.current = promptKey;

    if (!preReadsPromptSent) {
      const preReadsPrompt = `Recommend top pre-reads for this contract review meeting so that I can contribute effectively. 
     
      Analyze the contract content and provide specific recommendations. 
  
      Include:
 - Key sections to review
 - Important terms and conditions to understand
 - Relevant background information
 - Questions to prepare for the meeting
 
Meeting: ${meetingTitle}
Contract: ${contractTitle}`;

      setPreReadsPromptSent(true);
      setWelcomeMessageLoaded(true);
      autoPromptPendingRef.current = true;
      handleSendMessage(preReadsPrompt, true).finally(() => {
        autoPromptPendingRef.current = false;
      });
    }
  }, [
    mode,
    event,
    chatMessages.length,
    isAiLoading,
    preReadsPromptSent,
    contractData?.title,
    contractData?.noticeId,
    handleSendMessage,
  ]);

  // Build context for AI requests
const buildContext = useCallback((): string => {
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
        context += `Description/Agenda: ${event.description}\n`;
        context += `Note: The event description above IS the agenda for this meeting. When asked about the agenda, refer to this description.\n`;
      }
      if (event.participants) {
        context += `Participants: ${event.participants}\n`;
      }

      // Include organizer information prominently
      if (organizerInfo) {
        context += `ORGANIZER INFORMATION:\n`;
        context += `Organizer Name: ${organizerInfo.name || 'Unknown'}\n`;
        if (organizerInfo.email) {
          context += `Organizer Email: ${organizerInfo.email}\n`;
        }
        context += `Note: When drafting messages, ALWAYS use the organizer's actual name "${organizerInfo.name}" in the salutation, NOT generic terms like "Dear Organizer".\n`;
        context += `\n`;
      } else if (event.createdBy && event.createdBy !== 'outlook-sync') {
        context += `ORGANIZER INFORMATION:\n`;
        context += `Organizer ID: ${event.createdBy}\n`;
        context += `\n`;
      }

      context += `\n`;
    }

    // Include contract information for both pre-reads and chat modes
    // if contract data is available
    if (contractData) {
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

    // Include event attachments information
    // Note: attachments may be file IDs or full objects
    const attachmentFileIds = event?.attachments
      ? event.attachments.map((att) =>
          typeof att === 'string' ? att : att.$id
        )
      : [];
    if (attachmentFileIds.length > 0) {
      context += `\nEVENT ATTACHMENTS:\n`;
      context += `The event has ${attachmentFileIds.length} attached document(s) that may contain relevant information.\n`;
      context += `Note: Attachment content will be extracted and included in the analysis.\n`;
    }

    return context;
}, [event, contractData, organizerInfo]);

  // Send message to AI
const handleSendMessage = useCallback(
  async (messageText?: string, autoSend = false) => {
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

      const rawAttachments: AttachmentLike[] = Array.isArray(event?.attachments)
        ? event.attachments
        : [];

      let attachmentsForProcessing: AttachmentLike[] = rawAttachments;

      if (rawAttachments.length > 0) {
        const attachmentsMissingDetails = rawAttachments.filter(
          (attachment) =>
            isAttachmentObject(attachment) &&
            (!attachment.url || !attachment.extension || !attachment.name)
        );

        if (attachmentsMissingDetails.length > 0) {
          const fileIdsToFetch = Array.from(
            new Set(
              rawAttachments
                .map((attachment) =>
                  typeof attachment === 'string'
                    ? attachment
                    : attachment.$id || attachment.fileId || attachment.id
                )
                .filter(
                  (id): id is string => typeof id === 'string' && id.length > 0
                )
            )
          );

          if (fileIdsToFetch.length > 0) {
            try {
              const detailsResponse = await fetch('/api/files/get-by-ids', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileIds: fileIdsToFetch }),
              });

              if (detailsResponse.ok) {
                const fetchedDetails: EventAttachment[] =
                  await detailsResponse.json();
                const detailMap = new Map(
                  fetchedDetails.map((detail) => [detail.$id, detail])
                );

                attachmentsForProcessing = rawAttachments.map(
                  (attachment) => {
                    const fileId =
                      typeof attachment === 'string'
                        ? attachment
                        : attachment.$id ||
                          attachment.fileId ||
                          attachment.id ||
                          '';

                    const detail = fileId ? detailMap.get(fileId) : null;

                    if (detail) {
                      if (typeof attachment === 'string') {
                        return detail;
                      }
                      return { ...attachment, ...detail };
                    }

                    return attachment;
                  }
                );
              } else {
                console.error('Failed to resolve attachment details for AI:', {
                  status: detailsResponse.status,
                  statusText: detailsResponse.statusText,
                });
              }
            } catch (resolveError) {
              console.error(
                'Error resolving attachment details for AI:',
                resolveError
              );
            }
          }
        }
      }

      // Extract content from attachments
      let attachmentContents = '';
      if (attachmentsForProcessing.length > 0) {
        try {
          const extractionPromises = attachmentsForProcessing.map(
            async (attachment) => {
              try {
                const fileId =
                  typeof attachment === 'string'
                    ? attachment
                    : attachment.$id || attachment.fileId || attachment.id || '';
                const displayName =
                  isAttachmentObject(attachment)
                    ? attachment.name || fileId || 'Attachment'
                    : fileId || 'Attachment';

                if (!isAttachmentObject(attachment)) {
                  return `\n\n--- ${displayName} ---\n(Attachment metadata unavailable; content cannot be retrieved.)\n`;
                }

                if (!attachment.url) {
                  return `\n\n--- ${displayName} ---\n(Attachment metadata available but file URL is missing; content cannot be retrieved.)\n`;
                }

                // For PDFs, use the dedicated extraction API
                if (
                  attachment.extension &&
                  attachment.extension.toLowerCase() === 'pdf'
                ) {
                  const extractResponse = await fetch('/api/extract-pdf-text', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      fileUrl: attachment.url,
                      fileName: displayName,
                    }),
                  });

                  if (extractResponse.ok) {
                    const extractResult = await extractResponse.json();
                    return `\n\n--- Content from ${displayName} ---\n${
                      extractResult.text || 'Unable to extract text'
                    }\n`;
                  }
                } else {
                  // For other file types (images, docs), note that extraction may be limited
                  // The AI will have access to the file URLs and metadata
                  return `\n\n--- ${displayName} (${
                    attachment.extension
                      ? attachment.extension.toUpperCase()
                      : 'FILE'
                  }) ---\n(File attached - content extraction may be limited for ${
                    attachment.extension
                      ? attachment.extension.toUpperCase()
                      : 'these'
                  } files)\n`;
                }
                return `\n\n--- ${displayName} ---\n(Content extraction not available)\n`;
              } catch (error) {
                console.warn('Failed to extract content from attachment:', {
                  attachment,
                  error,
                });
                const fallbackName =
                  (attachment && attachment.name) ||
                  (typeof attachment === 'string'
                    ? attachment
                    : attachment?.$id) ||
                  'Attachment';
                return `\n\n--- ${fallbackName} ---\n(Unable to extract content)\n`;
              }
            }
          );

          const extractedContents = await Promise.all(extractionPromises);
          attachmentContents = extractedContents.join('\n');
        } catch (error) {
          console.error('Error extracting attachment contents:', error);
        }
      }

      // For chat mode, include contract content if available
      // The context already includes contract information, but we also include
      // full contract content in fileContent for comprehensive analysis
      const fileContent = (contractData?.content || '') + attachmentContents;

      // Log contract and attachment availability for debugging
      if (contractData || attachmentsForProcessing.length > 0) {
        console.log('Data available for AI:', {
          hasContractContent: !!contractData?.content,
          contractContentLength: contractData?.content?.length || 0,
          attachmentCount: attachmentsForProcessing.length,
          attachmentContentsLength: attachmentContents.length,
          mode: mode,
        });
      }

      const fileName =
        mode === 'pre-reads'
          ? contractData?.title || event?.title || 'Contract Review'
          : event?.title || 'Meeting';

      // Build enhanced prompt for message drafting requests
      let enhancedQuestion = textToSend;

      // Add agenda clarification if user asks about agenda
      if (
        textToSend.toLowerCase().includes('agenda') ||
        textToSend.toLowerCase().includes('what will we discuss') ||
        textToSend.toLowerCase().includes('meeting topics')
      ) {
        enhancedQuestion = `${textToSend}\n\nIMPORTANT: The event description provided in the context IS the agenda for this meeting. If an event description exists, use it as the agenda. Do not say the document doesn't contain an agenda if the event description is present.`;
      } else if (
        textToSend.toLowerCase().includes('draft a message') ||
        textToSend.toLowerCase().includes('message to the organizer') ||
        textToSend.toLowerCase().includes('send a message')
      ) {
        const organizerSalutation = organizerInfo?.name
          ? `Use the organizer's actual name "${
              organizerInfo.name
            }" in the salutation (e.g., "Dear ${
              organizerInfo.name.split(' ')[0]
            }," or "Hello ${
              organizerInfo.name
            },"). DO NOT use generic terms like "Dear Organizer" or "Hello Organizer".`
          : 'If the organizer\'s name is available in the context, use their actual name in the salutation. DO NOT use generic terms like "Dear Organizer".';

        enhancedQuestion = `${textToSend}\n\nIMPORTANT INSTRUCTIONS:\n- This should be an INITIAL message to the organizer, NOT a follow-up or reply.\n- Write it as if the user is sending a message to the organizer BEFORE the meeting/event.\n- ${organizerSalutation}\n- The message should be professional and appropriate for contacting the event organizer.\n- Include relevant context about the event in the message.`;
      }

      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'question',
          question: enhancedQuestion,
          fileName: fileName,
          fileType: mode === 'pre-reads' ? 'contract' : 'meeting',
          // Include full contract content in fileContent for comprehensive analysis
          // Context already includes contract summary, fileContent provides full content
          fileContent:
            context +
            (fileContent ? `\n\nFULL CONTRACT DOCUMENT:\n${fileContent}` : ''),
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
  },
  [aiInput, buildContext, contractData, event, mode, organizerInfo]
);

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
        'What should I prepare before this meeting?',
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

      {isContractLoading && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#078FAB]" />
          <span>Fetching contract details...</span>
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {mode === 'pre-reads' &&
            chatMessages.length === 0 &&
            !isAiLoading &&
            !preReadsPromptSent && (
              <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#078FAB]/10 text-[#078FAB]">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Kickstart your pre-read review
                      </h4>
                      <p className="text-xs text-slate-500">
                        Use one of the quick prompts below to analyze the
                        attached documents faster.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-5">
                  {RECOMMENDED_ACTIONS['pre-reads'].map(
                    ({ value, title, description, icon: Icon }, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestedAction(value)}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#078FAB] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-1"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#078FAB]/10 text-[#078FAB]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {description}
                          </p>
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

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
                            I can see you have a calendar event titled &quot;
                            {event.title}&quot; scheduled for{' '}
                            {event.startDate &&
                              format(
                                new Date(event.startDate),
                                'EEEE, MMMM d, yyyy'
                              )}
                            {event.startTime && ` at ${event.startTime}`}.
                          </p>
                          <p>
                            I have access to your event details including the
                            description, participants, and location. I can help
                            you draft an agenda, prepare questions, and provide
                            insights for this meeting.
                          </p>
                          {event.description && event.description.trim() && (
                            <p className="text-xs text-gray-500 italic">
                              Event description:{' '}
                              {event.description.substring(0, 100)}
                              {event.description.length > 100 ? '...' : ''}
                            </p>
                          )}
                          <p>
                            What would you like help with? I can assist with:
                          </p>
                          <ul className="text-xs text-gray-600 list-disc list-inside ml-2 space-y-1">
                            <li>Drafting a meeting agenda</li>
                            <li>Preparing discussion questions</li>
                            <li>
                              Analyzing contract details (if this is a contract
                              review)
                            </li>
                            <li>Meeting preparation recommendations</li>
                          </ul>
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
                  <div className="flex-1">
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-drop-1 border border-light-300">
                      <div
                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: formatAIResponse(message.text),
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() =>
                            handleCopyMessage(message.id, message.text)
                          }
                          title="Copy response"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {message.sender === 'user' && (
                <div className="bg-gradient-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] text-white rounded-2xl px-4 py-3 max-w-[85%] shadow-drop-1">
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className="text-xs text-blue-100 mt-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
            <div className="space-y-3">
              {RECOMMENDED_ACTIONS.chat.map(
                ({ value, title, description, icon: Icon }, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedAction(value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#078FAB] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-1"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#078FAB]/10 text-[#078FAB]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              )}
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
              className="text-sm focus-visible:ring-[#078FAB] image.png"
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
