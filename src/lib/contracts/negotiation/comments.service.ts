import { ID } from "node-appwrite";
import { getUserById } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import {
	buildComment,
	displayNameFromEmail,
	type NegotiationCommentDraft,
} from "./comments.logic";
import { commentsTable, dbId, Query } from "./contract-scope";

export type NegotiationComment = NegotiationCommentDraft & {
	$id: string;
	$createdAt: string;
};

function mapComment(row: Record<string, unknown>): NegotiationComment {
	const authorEmail = String(row.authorEmail || "");
	const storedName = String(row.authorName || "").trim();
	return {
		$id: String(row.$id),
		contractId: String(row.contractId || ""),
		orgId: String(row.orgId || ""),
		versionId: String(row.versionId || ""),
		anchorType:
			(row.anchorType as NegotiationComment["anchorType"]) || "paragraph",
		anchorStart: Number(row.anchorStart || 0),
		anchorEnd: Number(row.anchorEnd || 0),
		body: String(row.body || ""),
		authorType:
			(row.authorType as NegotiationComment["authorType"]) || "internal",
		authorId: String(row.authorId || ""),
		authorEmail,
		authorName: storedName || displayNameFromEmail(authorEmail) || undefined,
		status: (row.status as NegotiationComment["status"]) || "open",
		redlineProposal: String(row.redlineProposal || ""),
		visibility:
			(row.visibility as NegotiationComment["visibility"]) === "internal"
				? "internal"
				: "shared",
		$createdAt: String(row.$createdAt || ""),
	};
}

async function enrichAuthorNames(
	comments: NegotiationComment[],
): Promise<NegotiationComment[]> {
	const ids = [
		...new Set(
			comments
				.filter((row) => row.authorType === "internal" && row.authorId)
				.map((row) => row.authorId),
		),
	];
	if (ids.length === 0) return comments;

	const nameById = new Map<string, string>();
	await Promise.all(
		ids.map(async (id) => {
			try {
				const user = (await getUserById(id)) as {
					fullName?: string;
				} | null;
				const name = String(user?.fullName || "").trim();
				if (name) nameById.set(id, name);
			} catch {
				/* best-effort name lookup */
			}
		}),
	);

	return comments.map((comment) => {
		if (comment.authorType !== "internal") return comment;
		const resolved = nameById.get(comment.authorId);
		if (!resolved) return comment;
		return { ...comment, authorName: resolved };
	});
}

export async function listComments(
	contractId: string,
): Promise<NegotiationComment[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: commentsTable(),
		queries: [
			Query.equal("contractId", contractId),
			Query.orderDesc("$createdAt"),
			Query.limit(100),
		],
	});
	const mapped = response.rows.map((row) =>
		mapComment(row as unknown as Record<string, unknown>),
	);
	return enrichAuthorNames(mapped);
}

export async function getComment(
	commentId: string,
): Promise<NegotiationComment | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: commentsTable(),
			rowId: commentId,
		});
		return mapComment(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createComment(
	input: Parameters<typeof buildComment>[0],
): Promise<NegotiationComment> {
	const draft = buildComment(input);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: commentsTable(),
		rowId: ID.unique(),
		data: {
			contractId: draft.contractId,
			orgId: draft.orgId,
			versionId: draft.versionId,
			anchorType: draft.anchorType,
			anchorStart: draft.anchorStart,
			anchorEnd: draft.anchorEnd,
			body: draft.body,
			authorType: draft.authorType,
			authorId: draft.authorId,
			authorEmail: draft.authorEmail,
			authorName: draft.authorName || "",
			status: draft.status,
			redlineProposal: draft.redlineProposal,
			visibility: draft.visibility,
		},
	});
	const mapped = mapComment(row as unknown as Record<string, unknown>);
	return {
		...mapped,
		authorName: draft.authorName || mapped.authorName,
	};
}

export async function updateComment(
	commentId: string,
	patch: {
		status?: "open" | "resolved";
		redlineProposal?: string;
		body?: string;
	},
): Promise<NegotiationComment> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.status) data.status = patch.status;
	if (patch.redlineProposal !== undefined) {
		data.redlineProposal = patch.redlineProposal;
	}
	if (patch.body !== undefined) data.body = patch.body;
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: commentsTable(),
		rowId: commentId,
		data,
	});
	return mapComment(row as unknown as Record<string, unknown>);
}
