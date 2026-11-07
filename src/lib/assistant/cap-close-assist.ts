/** CAP statuses where Mark closed is allowed (matches finding card). */
export function isCapClosableStatus(status: string | null | undefined): boolean {
	return status === "in_progress" || status === "pending_verification";
}

export type CapCloseAssistIntent =
	| { kind: "open_dialog" }
	| { kind: "stage_note" }
	| null;

const OPEN_DIALOG =
	/\b(open|show|launch|bring\s+up)\b.*\b(dialog|modal|mark\s+closed|close\s+(?:the\s+)?(?:cap|corrective\s+action))\b|\b(paste|put|fill)\b.*\b(verification|close|mark\s+closed|dialog)\b|\bmark\s+closed\b.*\b(with|using|this)\b/i;

const STAGE_NOTE =
	/\b(write|draft|compose|create|give\s+me|suggest)\b.*\b(verification\s+note|closing\s+note|close\s+note)\b/i;

export function detectCapCloseAssistIntent(message: string): CapCloseAssistIntent {
	const text = message.trim();
	if (!text) return null;
	if (OPEN_DIALOG.test(text)) return { kind: "open_dialog" };
	if (STAGE_NOTE.test(text)) return { kind: "stage_note" };
	return null;
}

/** Pull verification prose from assistant markdown (blockquote, quotes, or labeled section). */
export function extractVerificationNoteFromText(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	const blockquoteMatch = trimmed.match(
		/(?:^|\n)>\s*["“]?([^"\n]+(?:\n[^>\n]+)*)["”]?/m,
	);
	if (blockquoteMatch?.[1]) {
		const note = blockquoteMatch[1].replace(/^>\s?/gm, "").trim();
		if (note.length >= 10) return note;
	}

	// "Open mark closed and paste the following: <note>" — take the text after the colon.
	const pasteMatch = trimmed.match(
		/\b(?:paste|paste\s+the\s+following|with\s+this\s+note|close\s+note)\b[:\s]+["“]?([\s\S]+?)["”]?$/i,
	);
	if (pasteMatch?.[1]) {
		const note = pasteMatch[1].trim();
		if (note.length >= 10) return note.slice(0, 4000);
	}

	const labeled = trimmed.match(
		/(?:verification\s+note|closing\s+note|suggested\s+note)[:\s]+["“]?([\s\S]+?)["”]?(?:\n\n|$)/i,
	);
	if (labeled?.[1]) {
		const note = labeled[1].trim();
		if (note.length >= 10) return note.slice(0, 4000);
	}

	const quoted = trimmed.match(/["“]([^"”\n]{20,})["”]/);
	if (quoted?.[1]) return quoted[1].trim().slice(0, 4000);

	return null;
}

export function lastAssistantMessageContent(
	messages: { role: string; content?: string }[],
): string | null {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const msg = messages[i];
		if (msg?.role === "assistant" && msg.content?.trim()) {
			return msg.content.trim();
		}
	}
	return null;
}

export function resolveVerificationNoteForClose(params: {
	userMessage: string;
	priorAssistantContent: string | null;
	stagedDraft: string | null;
}): string {
	const fromUser = extractVerificationNoteFromText(params.userMessage);
	if (fromUser) return fromUser;
	const fromPrior = params.priorAssistantContent
		? extractVerificationNoteFromText(params.priorAssistantContent)
		: null;
	if (fromPrior) return fromPrior;
	return params.stagedDraft?.trim() ?? "";
}
