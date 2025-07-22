/**
 * Formats AI response text to be more readable with proper paragraph breaks,
 * bullet points, and other formatting improvements.
 */
export function formatAIResponse(text: string): string {
  if (!text) return text;

  let formatted = text;

  // Convert markdown-style bullet points to proper formatting
  formatted = formatted.replace(/^\s*[-*•]\s+/gm, '• ');

  // Convert numbered lists
  formatted = formatted.replace(/^\s*(\d+)\.\s+/gm, '$1. ');

  // Add line breaks before bullet points and numbered lists
  formatted = formatted.replace(/([.!?])\s*([•\d])/g, '$1\n\n$2');

  // Add line breaks before common section headers
  const sectionHeaders = [
    'Summary:',
    'Key Points:',
    'Important:',
    'Note:',
    'Warning:',
    'Example:',
    'Conclusion:',
    'Recommendations:',
    'Next Steps:',
    'Actions Required:',
  ];

  sectionHeaders.forEach((header) => {
    const regex = new RegExp(
      `([.!?])\\s*(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    formatted = formatted.replace(regex, '$1\n\n$2');
  });

  // Add line breaks before "The document" or "This document" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The document|This document)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "Based on" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(Based on)/gi, '$1\n\n$2');

  // Add line breaks before "The contract" or "This contract" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The contract|This contract)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The agreement" or "This agreement" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The agreement|This agreement)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The parties" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The parties)/gi, '$1\n\n$2');

  // Add line breaks before "The terms" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The terms)/gi, '$1\n\n$2');

  // Add line breaks before "The services" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The services)/gi, '$1\n\n$2');

  // Add line breaks before "The compensation" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The compensation)/gi, '$1\n\n$2');

  // Add line breaks before "The termination" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The termination)/gi, '$1\n\n$2');

  // Add line breaks before "The compliance" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The compliance)/gi, '$1\n\n$2');

  // Add line breaks before "The reporting" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The reporting)/gi, '$1\n\n$2');

  // Add line breaks before "The audit" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The audit)/gi, '$1\n\n$2');

  // Add line breaks before "The scope" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The scope)/gi, '$1\n\n$2');

  // Add line breaks before "The duration" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The duration)/gi, '$1\n\n$2');

  // Add line breaks before "The effective date" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The effective date)/gi, '$1\n\n$2');

  // Add line breaks before "The expiration date" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The expiration date)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The renewal" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The renewal)/gi, '$1\n\n$2');

  // Add line breaks before "The amendment" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The amendment)/gi, '$1\n\n$2');

  // Add line breaks before "The assignment" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The assignment)/gi, '$1\n\n$2');

  // Add line breaks before "The confidentiality" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The confidentiality)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The intellectual property" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The intellectual property)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The liability" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The liability)/gi, '$1\n\n$2');

  // Add line breaks before "The indemnification" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The indemnification)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The force majeure" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The force majeure)/gi, '$1\n\n$2');

  // Add line breaks before "The governing law" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The governing law)/gi, '$1\n\n$2');

  // Add line breaks before "The dispute resolution" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The dispute resolution)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The entire agreement" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The entire agreement)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The severability" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The severability)/gi, '$1\n\n$2');

  // Add line breaks before "The waiver" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The waiver)/gi, '$1\n\n$2');

  // Add line breaks before "The notices" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The notices)/gi, '$1\n\n$2');

  // Add line breaks before "The signatures" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The signatures)/gi, '$1\n\n$2');

  // Add line breaks before "The exhibits" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The exhibits)/gi, '$1\n\n$2');

  // Add line breaks before "The attachments" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The attachments)/gi, '$1\n\n$2');

  // Add line breaks before "The appendices" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The appendices)/gi, '$1\n\n$2');

  // Add line breaks before "The schedules" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The schedules)/gi, '$1\n\n$2');

  // Add line breaks before "The addenda" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The addenda)/gi, '$1\n\n$2');

  // Add line breaks before "The amendments" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The amendments)/gi, '$1\n\n$2');

  // Add line breaks before "The modifications" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The modifications)/gi, '$1\n\n$2');

  // Add line breaks before "The changes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The changes)/gi, '$1\n\n$2');

  // Add line breaks before "The updates" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The updates)/gi, '$1\n\n$2');

  // Add line breaks before "The revisions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The revisions)/gi, '$1\n\n$2');

  // Add line breaks before "The corrections" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The corrections)/gi, '$1\n\n$2');

  // Add line breaks before "The clarifications" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The clarifications)/gi, '$1\n\n$2');

  // Add line breaks before "The definitions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The definitions)/gi, '$1\n\n$2');

  // Add line breaks before "The interpretation" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The interpretation)/gi, '$1\n\n$2');

  // Add line breaks before "The construction" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The construction)/gi, '$1\n\n$2');

  // Add line breaks before "The meaning" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The meaning)/gi, '$1\n\n$2');

  // Add line breaks before "The purpose" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The purpose)/gi, '$1\n\n$2');

  // Add line breaks before "The objective" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The objective)/gi, '$1\n\n$2');

  // Add line breaks before "The goal" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The goal)/gi, '$1\n\n$2');

  // Add line breaks before "The target" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The target)/gi, '$1\n\n$2');

  // Add line breaks before "The aim" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The aim)/gi, '$1\n\n$2');

  // Add line breaks before "The intention" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The intention)/gi, '$1\n\n$2');

  // Add line breaks before "The plan" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The plan)/gi, '$1\n\n$2');

  // Add line breaks before "The strategy" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The strategy)/gi, '$1\n\n$2');

  // Add line breaks before "The approach" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The approach)/gi, '$1\n\n$2');

  // Add line breaks before "The method" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The method)/gi, '$1\n\n$2');

  // Add line breaks before "The process" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The process)/gi, '$1\n\n$2');

  // Add line breaks before "The procedure" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The procedure)/gi, '$1\n\n$2');

  // Add line breaks before "The steps" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The steps)/gi, '$1\n\n$2');

  // Add line breaks before "The requirements" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The requirements)/gi, '$1\n\n$2');

  // Add line breaks before "The conditions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The conditions)/gi, '$1\n\n$2');

  // Add line breaks before "The criteria" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The criteria)/gi, '$1\n\n$2');

  // Add line breaks before "The standards" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The standards)/gi, '$1\n\n$2');

  // Add line breaks before "The guidelines" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The guidelines)/gi, '$1\n\n$2');

  // Add line breaks before "The policies" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The policies)/gi, '$1\n\n$2');

  // Add line breaks before "The rules" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The rules)/gi, '$1\n\n$2');

  // Add line breaks before "The regulations" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The regulations)/gi, '$1\n\n$2');

  // Add line breaks before "The laws" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The laws)/gi, '$1\n\n$2');

  // Add line breaks before "The statutes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The statutes)/gi, '$1\n\n$2');

  // Add line breaks before "The ordinances" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The ordinances)/gi, '$1\n\n$2');

  // Add line breaks before "The codes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The codes)/gi, '$1\n\n$2');

  // Add line breaks before "The standards" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The standards)/gi, '$1\n\n$2');

  // Add line breaks before "The specifications" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The specifications)/gi, '$1\n\n$2');

  // Add line breaks before "The requirements" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The requirements)/gi, '$1\n\n$2');

  // Add line breaks before "The obligations" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The obligations)/gi, '$1\n\n$2');

  // Add line breaks before "The responsibilities" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The responsibilities)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The duties" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The duties)/gi, '$1\n\n$2');

  // Add line breaks before "The rights" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The rights)/gi, '$1\n\n$2');

  // Add line breaks before "The privileges" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The privileges)/gi, '$1\n\n$2');

  // Add line breaks before "The benefits" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The benefits)/gi, '$1\n\n$2');

  // Add line breaks before "The advantages" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The advantages)/gi, '$1\n\n$2');

  // Add line breaks before "The disadvantages" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The disadvantages)/gi, '$1\n\n$2');

  // Add line breaks before "The risks" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The risks)/gi, '$1\n\n$2');

  // Add line breaks before "The challenges" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The challenges)/gi, '$1\n\n$2');

  // Add line breaks before "The issues" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The issues)/gi, '$1\n\n$2');

  // Add line breaks before "The problems" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The problems)/gi, '$1\n\n$2');

  // Add line breaks before "The concerns" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The concerns)/gi, '$1\n\n$2');

  // Add line breaks before "The questions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The questions)/gi, '$1\n\n$2');

  // Add line breaks before "The answers" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The answers)/gi, '$1\n\n$2');

  // Add line breaks before "The solutions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The solutions)/gi, '$1\n\n$2');

  // Add line breaks before "The recommendations" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The recommendations)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The suggestions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The suggestions)/gi, '$1\n\n$2');

  // Add line breaks before "The advice" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The advice)/gi, '$1\n\n$2');

  // Add line breaks before "The guidance" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The guidance)/gi, '$1\n\n$2');

  // Add line breaks before "The instructions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The instructions)/gi, '$1\n\n$2');

  // Add line breaks before "The directions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The directions)/gi, '$1\n\n$2');

  // Add line breaks before "The steps" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The steps)/gi, '$1\n\n$2');

  // Add line breaks before "The procedures" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The procedures)/gi, '$1\n\n$2');

  // Add line breaks before "The processes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The processes)/gi, '$1\n\n$2');

  // Add line breaks before "The methods" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The methods)/gi, '$1\n\n$2');

  // Add line breaks before "The approaches" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The approaches)/gi, '$1\n\n$2');

  // Add line breaks before "The strategies" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The strategies)/gi, '$1\n\n$2');

  // Add line breaks before "The plans" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The plans)/gi, '$1\n\n$2');

  // Add line breaks before "The goals" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The goals)/gi, '$1\n\n$2');

  // Add line breaks before "The objectives" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The objectives)/gi, '$1\n\n$2');

  // Add line breaks before "The purposes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The purposes)/gi, '$1\n\n$2');

  // Add line breaks before "The meanings" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The meanings)/gi, '$1\n\n$2');

  // Add line breaks before "The interpretations" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The interpretations)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The constructions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The constructions)/gi, '$1\n\n$2');

  // Add line breaks before "The definitions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The definitions)/gi, '$1\n\n$2');

  // Add line breaks before "The clarifications" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The clarifications)/gi, '$1\n\n$2');

  // Add line breaks before "The corrections" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The corrections)/gi, '$1\n\n$2');

  // Add line breaks before "The revisions" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The revisions)/gi, '$1\n\n$2');

  // Add line breaks before "The updates" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The updates)/gi, '$1\n\n$2');

  // Add line breaks before "The changes" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The changes)/gi, '$1\n\n$2');

  // Add line breaks before "The modifications" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The modifications)/gi, '$1\n\n$2');

  // Add line breaks before "The amendments" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The amendments)/gi, '$1\n\n$2');

  // Add line breaks before "The addenda" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The addenda)/gi, '$1\n\n$2');

  // Add line breaks before "The schedules" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The schedules)/gi, '$1\n\n$2');

  // Add line breaks before "The appendices" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The appendices)/gi, '$1\n\n$2');

  // Add line breaks before "The attachments" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The attachments)/gi, '$1\n\n$2');

  // Add line breaks before "The exhibits" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The exhibits)/gi, '$1\n\n$2');

  // Add line breaks before "The signatures" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The signatures)/gi, '$1\n\n$2');

  // Add line breaks before "The notices" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The notices)/gi, '$1\n\n$2');

  // Add line breaks before "The waiver" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The waiver)/gi, '$1\n\n$2');

  // Add line breaks before "The severability" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The severability)/gi, '$1\n\n$2');

  // Add line breaks before "The entire agreement" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The entire agreement)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The dispute resolution" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The dispute resolution)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The governing law" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The governing law)/gi, '$1\n\n$2');

  // Add line breaks before "The force majeure" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The force majeure)/gi, '$1\n\n$2');

  // Add line breaks before "The indemnification" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The indemnification)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The liability" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The liability)/gi, '$1\n\n$2');

  // Add line breaks before "The intellectual property" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The intellectual property)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The confidentiality" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The confidentiality)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The assignment" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The assignment)/gi, '$1\n\n$2');

  // Add line breaks before "The amendment" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The amendment)/gi, '$1\n\n$2');

  // Add line breaks before "The renewal" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The renewal)/gi, '$1\n\n$2');

  // Add line breaks before "The expiration date" when it starts a new thought
  formatted = formatted.replace(
    /([.!?])\s*(The expiration date)/gi,
    '$1\n\n$2'
  );

  // Add line breaks before "The effective date" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The effective date)/gi, '$1\n\n$2');

  // Add line breaks before "The duration" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The duration)/gi, '$1\n\n$2');

  // Add line breaks before "The scope" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The scope)/gi, '$1\n\n$2');

  // Add line breaks before "The audit" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The audit)/gi, '$1\n\n$2');

  // Add line breaks before "The reporting" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The reporting)/gi, '$1\n\n$2');

  // Add line breaks before "The compliance" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The compliance)/gi, '$1\n\n$2');

  // Add line breaks before "The termination" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The termination)/gi, '$1\n\n$2');

  // Add line breaks before "The compensation" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The compensation)/gi, '$1\n\n$2');

  // Add line breaks before "The services" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The services)/gi, '$1\n\n$2');

  // Add line breaks before "The terms" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The terms)/gi, '$1\n\n$2');

  // Add line breaks before "The parties" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The parties)/gi, '$1\n\n$2');

  // Add line breaks before "The agreement" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The agreement)/gi, '$1\n\n$2');

  // Add line breaks before "The contract" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The contract)/gi, '$1\n\n$2');

  // Add line breaks before "Based on" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(Based on)/gi, '$1\n\n$2');

  // Add line breaks before "This document" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(This document)/gi, '$1\n\n$2');

  // Add line breaks before "The document" when it starts a new thought
  formatted = formatted.replace(/([.!?])\s*(The document)/gi, '$1\n\n$2');

  // NEW: Break up long paragraphs by sentence length
  // Split paragraphs that are too long (more than 3 sentences without breaks)
  const sentences = formatted.split(/(?<=[.!?])\s+/);
  let currentParagraph = '';
  const paragraphs: string[] = [];

  for (const sentence of sentences) {
    currentParagraph += sentence + ' ';

    // If current paragraph has more than 3 sentences and is getting long, break it
    const sentenceCount = (currentParagraph.match(/[.!?]/g) || []).length;
    if (sentenceCount >= 3 && currentParagraph.length > 200) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  }

  // Add any remaining content
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }

  // Join paragraphs with double line breaks
  formatted = paragraphs.join('\n\n');

  // NEW: Add breaks before common transition phrases that indicate new thoughts
  const transitionPhrases = [
    'Additionally,',
    'Furthermore,',
    'Moreover,',
    'In addition,',
    'Also,',
    'Besides,',
    'Similarly,',
    'Likewise,',
    'However,',
    'Nevertheless,',
    'Nonetheless,',
    'On the other hand,',
    'In contrast,',
    'Conversely,',
    'Meanwhile,',
    'Subsequently,',
    'Therefore,',
    'Thus,',
    'Consequently,',
    'As a result,',
    'For example,',
    'For instance,',
    'Specifically,',
    'In particular,',
    'Notably,',
    'Importantly,',
    'Significantly,',
    'Essentially,',
    'Basically,',
    'Primarily,',
    'Mainly,',
    'Chiefly,',
    'Principally,',
    'Overall,',
    'In summary,',
    'In conclusion,',
    'To summarize,',
    'To conclude,',
    'In brief,',
    'In short,',
  ];

  transitionPhrases.forEach((phrase) => {
    const regex = new RegExp(
      `([.!?])\\s*(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    formatted = formatted.replace(regex, '$1\n\n$2');
  });

  // NEW: Break up very long sentences (more than 150 characters) at natural break points
  const longSentenceBreaks = [
    ' and ',
    ' or ',
    ' but ',
    ' however ',
    ' therefore ',
    ' thus ',
    ' consequently ',
    ' as a result ',
    ' for example ',
    ' for instance ',
    ' specifically ',
    ' in particular ',
    ' notably ',
    ' importantly ',
    ' significantly ',
    ' essentially ',
    ' basically ',
    ' primarily ',
    ' mainly ',
    ' chiefly ',
    ' principally ',
    ' overall ',
    ' in summary ',
    ' in conclusion ',
    ' to summarize ',
    ' to conclude ',
    ' in brief ',
    ' in short ',
  ];

  // Split very long sentences at natural break points
  const lines = formatted.split('\n');
  const processedLines: string[] = [];

  for (const line of lines) {
    if (line.length > 150) {
      // Try to break at natural break points
      let brokenLine = line;
      for (const breakPoint of longSentenceBreaks) {
        const parts = brokenLine.split(breakPoint);
        if (parts.length > 1) {
          // Only break if it would create reasonable chunks
          const canBreak = parts.some(
            (part) => part.length > 50 && part.length < 120
          );
          if (canBreak) {
            brokenLine = parts.join('\n' + breakPoint.trim());
            break;
          }
        }
      }
      processedLines.push(brokenLine);
    } else {
      processedLines.push(line);
    }
  }

  formatted = processedLines.join('\n');

  // Clean up multiple consecutive line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Ensure proper spacing around bullet points
  formatted = formatted.replace(/\n•\s*/g, '\n\n• ');

  // Ensure proper spacing around numbered lists
  formatted = formatted.replace(/\n(\d+)\.\s*/g, '\n\n$1. ');

  return formatted.trim();
}
