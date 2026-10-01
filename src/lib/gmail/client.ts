import { buildRawEmail } from "@/lib/gmail/mime";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailMessageSummary {
	id: string;
	threadId: string;
	subject: string;
	from: string;
	snippet: string;
	date: string;
	unread: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
	bodyText: string;
	bodyHtml: string;
	to: string;
}

async function gmailFetch<T>(
	accessToken: string,
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${GMAIL_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Gmail API error: ${error}`);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

function getHeader(
	headers: { name: string; value: string }[] | undefined,
	name: string,
): string {
	return (
		headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
		""
	);
}

function decodeBody(data?: string): string {
	if (!data) return "";
	const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractBodies(payload: GmailPayloadPart | undefined): {
	text: string;
	html: string;
} {
	if (!payload) return { text: "", html: "" };

	if (payload.body?.data) {
		const decoded = decodeBody(payload.body.data);
		if (payload.mimeType === "text/html") {
			return { text: "", html: decoded };
		}
		return { text: decoded, html: "" };
	}

	let text = "";
	let html = "";
	for (const part of payload.parts || []) {
		const nested = extractBodies(part);
		text = text || nested.text;
		html = html || nested.html;
	}
	return { text, html };
}

interface GmailPayloadPart {
	mimeType?: string;
	body?: { data?: string; size?: number };
	headers?: { name: string; value: string }[];
	parts?: GmailPayloadPart[];
}

interface GmailListResponse {
	messages?: { id: string; threadId: string }[];
}

interface GmailMessageResponse {
	id: string;
	threadId: string;
	labelIds?: string[];
	snippet?: string;
	internalDate?: string;
	payload?: GmailPayloadPart;
}

export async function listMessages(
	accessToken: string,
	options: { labelIds?: string; maxResults?: number } = {},
): Promise<GmailMessageSummary[]> {
	const params = new URLSearchParams({
		maxResults: String(options.maxResults ?? 25),
	});
	if (options.labelIds) {
		params.set("labelIds", options.labelIds);
	}

	const list = await gmailFetch<GmailListResponse>(
		accessToken,
		`/messages?${params.toString()}`,
	);

	const ids = list.messages || [];
	const summaries: GmailMessageSummary[] = [];

	for (const item of ids) {
		const msg = await gmailFetch<GmailMessageResponse>(
			accessToken,
			`/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
		);
		const headers = msg.payload?.headers;
		summaries.push({
			id: msg.id,
			threadId: msg.threadId,
			subject: getHeader(headers, "Subject") || "(No subject)",
			from: getHeader(headers, "From"),
			snippet: msg.snippet || "",
			date: getHeader(headers, "Date") || msg.internalDate || "",
			unread: (msg.labelIds || []).includes("UNREAD"),
		});
	}

	return summaries;
}

export async function getMessage(
	accessToken: string,
	messageId: string,
): Promise<GmailMessageDetail> {
	const msg = await gmailFetch<GmailMessageResponse>(
		accessToken,
		`/messages/${messageId}?format=full`,
	);
	const headers = msg.payload?.headers;
	const bodies = extractBodies(msg.payload);

	return {
		id: msg.id,
		threadId: msg.threadId,
		subject: getHeader(headers, "Subject") || "(No subject)",
		from: getHeader(headers, "From"),
		to: getHeader(headers, "To"),
		snippet: msg.snippet || "",
		date: getHeader(headers, "Date") || msg.internalDate || "",
		unread: (msg.labelIds || []).includes("UNREAD"),
		bodyText: bodies.text,
		bodyHtml: bodies.html,
	};
}

export async function listDrafts(
	accessToken: string,
	maxResults = 25,
): Promise<GmailMessageSummary[]> {
	const list = await gmailFetch<{ drafts?: { id: string; message: { id: string; threadId: string } }[] }>(
		accessToken,
		`/drafts?maxResults=${maxResults}`,
	);

	const summaries: GmailMessageSummary[] = [];
	for (const draft of list.drafts || []) {
		const msg = await gmailFetch<GmailMessageResponse>(
			accessToken,
			`/messages/${draft.message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
		);
		const headers = msg.payload?.headers;
		summaries.push({
			id: draft.id,
			threadId: msg.threadId,
			subject: getHeader(headers, "Subject") || "(Draft)",
			from: getHeader(headers, "From"),
			snippet: msg.snippet || "",
			date: getHeader(headers, "Date") || "",
			unread: false,
		});
	}
	return summaries;
}

export async function createDraft(
	accessToken: string,
	options: { to: string; subject: string; body: string; fromEmail?: string },
): Promise<{ draftId: string }> {
	const raw = buildRawEmail(options);
	const result = await gmailFetch<{ id: string }>(accessToken, "/drafts", {
		method: "POST",
		body: JSON.stringify({ message: { raw } }),
	});
	return { draftId: result.id };
}

export async function sendMessage(
	accessToken: string,
	options: { to: string; subject: string; body: string; fromEmail?: string },
): Promise<{ id: string }> {
	const raw = buildRawEmail(options);
	return gmailFetch<{ id: string }>(accessToken, "/messages/send", {
		method: "POST",
		body: JSON.stringify({ raw }),
	});
}
