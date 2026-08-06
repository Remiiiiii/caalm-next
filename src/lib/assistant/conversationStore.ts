import { ID, Query } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite/index";

export type ConversationStatus = "active" | "closed";

export type AssistantConversation = {
	$id: string;
	userId: string;
	orgId: string;
	title: string;
	lastMessagePreview: string;
	status: ConversationStatus;
	lastMessageAt: string;
	$createdAt: string;
	$updatedAt: string;
};

export type AssistantMessageRole = "user" | "assistant" | "system";

export type AssistantMessage = {
	$id: string;
	conversationId: string;
	userId: string;
	orgId: string;
	role: AssistantMessageRole;
	content: string;
	sourcesJson?: string;
	metadataJson?: string;
	$createdAt: string;
};

function conversationsCollection() {
	const id = appwriteConfig.assistantConversationsCollectionId;
	if (!id) throw new Error("Assistant conversations collection not configured");
	return id;
}

function messagesCollection() {
	const id = appwriteConfig.assistantMessagesCollectionId;
	if (!id) throw new Error("Assistant messages collection not configured");
	return id;
}

/** Ensures at most one active conversation per user+org. */
export async function closeOtherActiveConversations(
	userId: string,
	orgId: string,
	exceptConversationId?: string,
): Promise<void> {
	const { databases } = await createAdminClient();
	const response = await databases.listDocuments(
		appwriteConfig.databaseId!,
		conversationsCollection(),
		[
			Query.equal("userId", userId),
			Query.equal("orgId", orgId),
			Query.equal("status", "active"),
			Query.limit(100),
		],
	);

	await Promise.all(
		response.documents
			.filter((doc) => doc.$id !== exceptConversationId)
			.map((doc) =>
				databases.updateDocument(
					appwriteConfig.databaseId!,
					conversationsCollection(),
					doc.$id,
					{ status: "closed" },
				),
			),
	);
}

export async function setConversationActive(params: {
	conversationId: string;
	userId: string;
	orgId: string;
}): Promise<void> {
	await closeOtherActiveConversations(
		params.userId,
		params.orgId,
		params.conversationId,
	);
	await updateConversationMeta(params.conversationId, { status: "active" });
}

export async function createConversation(params: {
	userId: string;
	orgId: string;
	title?: string;
}): Promise<AssistantConversation> {
	const { databases } = await createAdminClient();
	await closeOtherActiveConversations(params.userId, params.orgId);
	const now = new Date().toISOString();
	const doc = await databases.createDocument(
		appwriteConfig.databaseId!,
		conversationsCollection(),
		ID.unique(),
		{
			userId: params.userId,
			orgId: params.orgId,
			title: params.title || "New conversation",
			lastMessagePreview: "",
			status: "active",
			lastMessageAt: now,
		},
	);
	return doc as unknown as AssistantConversation;
}

export async function listConversations(params: {
	userId: string;
	orgId: string;
	limit?: number;
	offset?: number;
}): Promise<{ conversations: AssistantConversation[]; total: number }> {
	const { databases } = await createAdminClient();
	const response = await databases.listDocuments(
		appwriteConfig.databaseId!,
		conversationsCollection(),
		[
			Query.equal("userId", params.userId),
			Query.equal("orgId", params.orgId),
			Query.orderDesc("lastMessageAt"),
			Query.limit(params.limit ?? 30),
			Query.offset(params.offset ?? 0),
		],
	);
	return {
		conversations: response.documents as unknown as AssistantConversation[],
		total: response.total,
	};
}

/** Most recently active open conversation for this user+org, if any. */
export async function getActiveConversation(
	userId: string,
	orgId: string,
): Promise<AssistantConversation | null> {
	const { databases } = await createAdminClient();
	const response = await databases.listDocuments(
		appwriteConfig.databaseId!,
		conversationsCollection(),
		[
			Query.equal("userId", userId),
			Query.equal("orgId", orgId),
			Query.equal("status", "active"),
			Query.orderDesc("lastMessageAt"),
			Query.limit(1),
		],
	);
	const doc = response.documents[0];
	return doc ? (doc as unknown as AssistantConversation) : null;
}

export async function getConversationForUser(
	conversationId: string,
	userId: string,
	orgId: string,
): Promise<AssistantConversation | null> {
	const { databases } = await createAdminClient();
	try {
		const doc = await databases.getDocument(
			appwriteConfig.databaseId!,
			conversationsCollection(),
			conversationId,
		);
		const c = doc as unknown as AssistantConversation;
		if (c.userId !== userId || c.orgId !== orgId) return null;
		return c;
	} catch {
		return null;
	}
}

export async function updateConversationMeta(
	conversationId: string,
	patch: Partial<{
		title: string;
		lastMessagePreview: string;
		status: ConversationStatus;
		lastMessageAt: string;
	}>,
): Promise<void> {
	const { databases } = await createAdminClient();
	await databases.updateDocument(
		appwriteConfig.databaseId!,
		conversationsCollection(),
		conversationId,
		patch,
	);
}

export async function listMessages(
	conversationId: string,
	limit = 100,
): Promise<AssistantMessage[]> {
	const { databases } = await createAdminClient();
	const response = await databases.listDocuments(
		appwriteConfig.databaseId!,
		messagesCollection(),
		[
			Query.equal("conversationId", conversationId),
			Query.orderAsc("$createdAt"),
			Query.limit(limit),
		],
	);
	return response.documents as unknown as AssistantMessage[];
}

export async function appendMessage(params: {
	conversationId: string;
	userId: string;
	orgId: string;
	role: AssistantMessageRole;
	content: string;
	sourcesJson?: string;
	metadataJson?: string;
}): Promise<AssistantMessage> {
	const { databases } = await createAdminClient();
	const doc = await databases.createDocument(
		appwriteConfig.databaseId!,
		messagesCollection(),
		ID.unique(),
		{
			conversationId: params.conversationId,
			userId: params.userId,
			orgId: params.orgId,
			role: params.role,
			content: params.content,
			sourcesJson: params.sourcesJson ?? "",
			metadataJson: params.metadataJson ?? "",
		},
	);
	return doc as unknown as AssistantMessage;
}

export function truncatePreview(text: string, max = 120): string {
	const plain = text.replace(/\s+/g, " ").trim();
	if (plain.length <= max) return plain;
	return `${plain.slice(0, max - 1)}…`;
}
