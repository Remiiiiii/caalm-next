import { extractOutlookSignatureFromHtml } from "@/lib/email/signature";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookMailSummary {
	id: string;
	threadId: string;
	subject: string;
	from: string;
	snippet: string;
	date: string;
	unread: boolean;
}

export interface OutlookMailDetail extends OutlookMailSummary {
	bodyText: string;
	bodyHtml: string;
	to: string;
}

async function graphFetch<T>(
	accessToken: string,
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${GRAPH_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Microsoft Graph mail error: ${error}`);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

function formatFrom(address?: {
	emailAddress?: { name?: string; address?: string };
}): string {
	const name = address?.emailAddress?.name?.trim();
	const email = address?.emailAddress?.address?.trim();
	if (name && email) return `${name} <${email}>`;
	return email || name || "";
}

function formatRecipients(
	recipients?: { emailAddress?: { name?: string; address?: string } }[],
): string {
	if (!recipients?.length) return "";
	return recipients.map((r) => formatFrom(r)).filter(Boolean).join(", ");
}

interface GraphMessage {
	id: string;
	conversationId?: string;
	subject?: string;
	bodyPreview?: string;
	receivedDateTime?: string;
	isRead?: boolean;
	from?: { emailAddress?: { name?: string; address?: string } };
	toRecipients?: { emailAddress?: { name?: string; address?: string } }[];
	body?: { contentType?: string; content?: string };
}

function toSummary(msg: GraphMessage): OutlookMailSummary {
	return {
		id: msg.id,
		threadId: msg.conversationId || msg.id,
		subject: msg.subject || "(No subject)",
		from: formatFrom(msg.from),
		snippet: msg.bodyPreview || "",
		date: msg.receivedDateTime || "",
		unread: msg.isRead === false,
	};
}

export async function listInboxMessages(
	accessToken: string,
	options?: { maxResults?: number },
): Promise<OutlookMailSummary[]> {
	const top = Math.min(Math.max(options?.maxResults ?? 50, 1), 100);
	const select =
		"id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from";
	const data = await graphFetch<{ value?: GraphMessage[] }>(
		accessToken,
		`/me/mailFolders/inbox/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${select}`,
	);
	return (data.value || []).map(toSummary);
}

export async function getMessage(
	accessToken: string,
	messageId: string,
): Promise<OutlookMailDetail> {
	const select =
		"id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,toRecipients,body";
	const msg = await graphFetch<GraphMessage>(
		accessToken,
		`/me/messages/${encodeURIComponent(messageId)}?$select=${select}`,
	);

	const contentType = (msg.body?.contentType || "").toLowerCase();
	const content = msg.body?.content || "";
	const isHtml = contentType === "html";

	return {
		...toSummary(msg),
		to: formatRecipients(msg.toRecipients),
		bodyHtml: isHtml ? content : "",
		bodyText: isHtml ? "" : content,
	};
}

export type OutlookMailAction =
	| "archive"
	| "unarchive"
	| "trash"
	| "untrash"
	| "markRead"
	| "markUnread";

async function moveMessage(
	accessToken: string,
	messageId: string,
	destinationId: string,
): Promise<void> {
	await graphFetch(
		accessToken,
		`/me/messages/${encodeURIComponent(messageId)}/move`,
		{
			method: "POST",
			body: JSON.stringify({ destinationId }),
		},
	);
}

export async function applyMessageAction(
	accessToken: string,
	messageId: string,
	action: OutlookMailAction,
): Promise<void> {
	switch (action) {
		case "archive":
			await moveMessage(accessToken, messageId, "archive");
			return;
		case "unarchive":
			await moveMessage(accessToken, messageId, "inbox");
			return;
		case "trash":
			await moveMessage(accessToken, messageId, "deleteditems");
			return;
		case "untrash":
			await moveMessage(accessToken, messageId, "inbox");
			return;
		case "markRead":
			await graphFetch(
				accessToken,
				`/me/messages/${encodeURIComponent(messageId)}`,
				{
					method: "PATCH",
					body: JSON.stringify({ isRead: true }),
				},
			);
			return;
		case "markUnread":
			await graphFetch(
				accessToken,
				`/me/messages/${encodeURIComponent(messageId)}`,
				{
					method: "PATCH",
					body: JSON.stringify({ isRead: false }),
				},
			);
			return;
		default: {
			const _exhaustive: never = action;
			throw new Error(`Unknown Outlook mail action: ${_exhaustive}`);
		}
	}
}

function toRecipientsPayload(to: string) {
	return to
		.split(/[,;]/)
		.map((part) => part.trim())
		.filter(Boolean)
		.map((address) => ({ emailAddress: { address } }));
}

export async function listDrafts(
	accessToken: string,
	options?: { maxResults?: number },
): Promise<OutlookMailSummary[]> {
	const top = Math.min(Math.max(options?.maxResults ?? 50, 1), 100);
	const select =
		"id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from";
	const data = await graphFetch<{ value?: GraphMessage[] }>(
		accessToken,
		`/me/mailFolders/drafts/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${select}`,
	);
	return (data.value || []).map(toSummary);
}

function bodyPayload(body: string, contentType: "text" | "html" = "text") {
	return {
		contentType: contentType === "html" ? "HTML" : "Text",
		content: body,
	};
}

export async function createDraft(
	accessToken: string,
	options: {
		to: string;
		subject: string;
		body: string;
		contentType?: "text" | "html";
	},
): Promise<{ draftId: string }> {
	const result = await graphFetch<{ id: string }>(
		accessToken,
		"/me/mailFolders/drafts/messages",
		{
			method: "POST",
			body: JSON.stringify({
				subject: options.subject,
				body: bodyPayload(options.body, options.contentType),
				toRecipients: toRecipientsPayload(options.to),
			}),
		},
	);
	return { draftId: result.id };
}

export async function sendMessage(
	accessToken: string,
	options: {
		to: string;
		subject: string;
		body: string;
		contentType?: "text" | "html";
		/** When set, create a reply draft from this message then send. */
		replyToMessageId?: string;
	},
): Promise<{ id: string }> {
	const contentType = options.contentType ?? "text";
	if (options.replyToMessageId) {
		const draft = await graphFetch<{ id: string }>(
			accessToken,
			`/me/messages/${encodeURIComponent(options.replyToMessageId)}/createReply`,
			{ method: "POST" },
		);
		await graphFetch(accessToken, `/me/messages/${encodeURIComponent(draft.id)}`, {
			method: "PATCH",
			body: JSON.stringify({
				subject: options.subject,
				body: bodyPayload(options.body, contentType),
				toRecipients: toRecipientsPayload(options.to),
			}),
		});
		await graphFetch(
			accessToken,
			`/me/messages/${encodeURIComponent(draft.id)}/send`,
			{ method: "POST" },
		);
		return { id: draft.id };
	}

	await graphFetch(accessToken, "/me/sendMail", {
		method: "POST",
		body: JSON.stringify({
			message: {
				subject: options.subject,
				body: bodyPayload(options.body, contentType),
				toRecipients: toRecipientsPayload(options.to),
			},
			saveToSentItems: true,
		}),
	});
	return { id: "sent" };
}

/**
 * Graph has no signature endpoint. Infer the user's Outlook signature from
 * recent Sent Items (HTML + inline attachments), matching what Outlook appends.
 */
export async function fetchOutlookSignatureHtml(
	accessToken: string,
): Promise<string | null> {
	const list = await fetch(
		`${GRAPH_BASE}/me/mailFolders/sentitems/messages?$top=8&$orderby=sentDateTime desc&$select=id,body,subject`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Prefer: 'outlook.body-content-type="html", outlook.allow-unsafe-html',
			},
		},
	);
	if (!list.ok) {
		const error = await list.text();
		throw new Error(`Microsoft Graph mail error: ${error}`);
	}
	const data = (await list.json()) as {
		value?: { id?: string; body?: { content?: string } }[];
	};

	for (const msg of data.value || []) {
		const id = msg.id;
		const html = msg.body?.content || "";
		if (!id || !html) continue;

		let attachments: {
			contentId?: string;
			contentBytes?: string;
			contentType?: string;
		}[] = [];
		try {
			const attRes = await graphFetch<{
				value?: {
					contentId?: string;
					contentBytes?: string;
					contentType?: string;
				}[];
			}>(
				accessToken,
				`/me/messages/${encodeURIComponent(id)}/attachments?$select=contentId,contentBytes,contentType,name`,
			);
			attachments = attRes.value || [];
		} catch {
			attachments = [];
		}

		const signature = extractOutlookSignatureFromHtml(html, attachments);
		if (signature?.trim()) return signature;
	}

	return null;
}
