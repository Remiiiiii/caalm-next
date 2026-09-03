import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	CLAUSE_CATEGORIES,
	CLAUSE_STATUSES,
	type Clause,
	type ClauseCategory,
	type ClauseStatus,
	type CreateClauseInput,
	type ListClausesFilters,
	type UpdateClauseInput,
} from "@/types/clauses";

export function isClauseCategory(value: unknown): value is ClauseCategory {
	return (
		typeof value === "string" &&
		(CLAUSE_CATEGORIES as readonly string[]).includes(value)
	);
}

export function isClauseStatus(value: unknown): value is ClauseStatus {
	return (
		typeof value === "string" &&
		(CLAUSE_STATUSES as readonly string[]).includes(value)
	);
}

function tableId(): string {
	return appwriteConfig.clausesCollectionId || "69c8f401001a2b3c4d01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): Clause {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		familyId: String(row.familyId || ""),
		version: Number(row.version) || 1,
		isCurrent: Boolean(row.isCurrent),
		title: String(row.title || ""),
		category: isClauseCategory(row.category) ? row.category : "other",
		body: String(row.body || ""),
		status: isClauseStatus(row.status) ? row.status : "draft",
		changeNote: row.changeNote ? String(row.changeNote) : undefined,
		createdBy: String(row.createdBy || ""),
		updatedBy: String(row.updatedBy || ""),
	};
}

/** Always includes orgId so list queries cannot leak across tenants. */
export function buildListQueries(filters: ListClausesFilters): string[] {
	const queries = [Query.equal("orgId", filters.orgId)];
	const currentOnly =
		filters.currentOnly ?? (filters.familyId ? false : true);

	if (filters.familyId) {
		queries.push(Query.equal("familyId", filters.familyId));
		queries.push(Query.orderDesc("version"));
	} else if (currentOnly) {
		queries.push(Query.equal("isCurrent", true));
		queries.push(Query.orderDesc("$updatedAt"));
	}

	if (filters.category) {
		queries.push(Query.equal("category", filters.category));
	}
	if (filters.status) {
		queries.push(Query.equal("status", filters.status));
	}

	queries.push(Query.limit(filters.limit ?? 200));
	return queries;
}

export function buildCreateClauseData(
	input: CreateClauseInput,
	ctx: { orgId: string; userId: string; familyId: string },
): Record<string, unknown> {
	const title = input.title.trim();
	const body = input.body.trim();
	if (!title) throw new Error("title is required");
	if (!body) throw new Error("body is required");
	if (!isClauseCategory(input.category)) {
		throw new Error("Invalid category");
	}

	const status = input.status ?? "draft";
	if (status === "archived") {
		throw new Error("Cannot create an archived clause");
	}

	return {
		orgId: ctx.orgId,
		familyId: ctx.familyId,
		version: 1,
		isCurrent: true,
		title,
		category: input.category,
		body,
		status,
		changeNote: input.changeNote?.trim() || null,
		createdBy: ctx.userId,
		updatedBy: ctx.userId,
	};
}

export type ClauseUpdatePlan =
	| {
			mode: "in-place";
			rowId: string;
			patch: Record<string, unknown>;
	  }
	| {
			mode: "version-bump";
			previousId: string;
			previousPatch: Record<string, unknown>;
			next: Record<string, unknown>;
	  };

function mergedFields(
	clause: Clause,
	input: UpdateClauseInput,
): {
	title: string;
	category: ClauseCategory;
	body: string;
	status: ClauseStatus;
	changeNote: string | null;
} {
	const title = (input.title ?? clause.title).trim();
	const body = (input.body ?? clause.body).trim();
	const category = input.category ?? clause.category;
	const status = input.status ?? clause.status;
	if (!title) throw new Error("title is required");
	if (!body) throw new Error("body is required");
	if (!isClauseCategory(category)) throw new Error("Invalid category");
	if (!isClauseStatus(status)) throw new Error("Invalid status");
	if (status === "archived") {
		throw new Error("Use archive instead of setting status to archived");
	}

	return {
		title,
		category,
		body,
		status,
		changeNote:
			input.changeNote !== undefined
				? input.changeNote.trim() || null
				: clause.changeNote || null,
	};
}

/** Drafts update the same row. Active clauses get a new version row. */
export function planClauseUpdate(
	clause: Clause,
	input: UpdateClauseInput,
	userId: string,
): ClauseUpdatePlan {
	const next = mergedFields(clause, input);

	if (clause.status === "draft") {
		return {
			mode: "in-place",
			rowId: clause.$id,
			patch: {
				title: next.title,
				category: next.category,
				body: next.body,
				status: next.status,
				changeNote: next.changeNote,
				updatedBy: userId,
			},
		};
	}

	return {
		mode: "version-bump",
		previousId: clause.$id,
		previousPatch: {
			isCurrent: false,
			updatedBy: userId,
		},
		next: {
			orgId: clause.orgId,
			familyId: clause.familyId,
			version: clause.version + 1,
			isCurrent: true,
			title: next.title,
			category: next.category,
			body: next.body,
			status: next.status,
			changeNote: next.changeNote,
			createdBy: clause.createdBy,
			updatedBy: userId,
		},
	};
}

export function planClauseArchive(
	clause: Clause,
	userId: string,
): { rowId: string; patch: Record<string, unknown> } {
	return {
		rowId: clause.$id,
		patch: {
			status: "archived",
			isCurrent: false,
			updatedBy: userId,
		},
	};
}

function matchesSearch(clause: Clause, search?: string): boolean {
	const q = search?.trim().toLowerCase();
	if (!q) return true;
	return (
		clause.title.toLowerCase().includes(q) ||
		clause.body.toLowerCase().includes(q) ||
		clause.category.toLowerCase().includes(q)
	);
}

export async function listClauses(
	filters: ListClausesFilters,
): Promise<Clause[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: buildListQueries(filters),
	});
	return (result.rows as unknown as Record<string, unknown>[])
		.map(mapRow)
		.filter((clause) => matchesSearch(clause, filters.search));
}

export async function getClauseById(id: string): Promise<Clause | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createClause(input: {
	orgId: string;
	userId: string;
	data: CreateClauseInput;
}): Promise<Clause> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: buildCreateClauseData(input.data, {
			orgId: input.orgId,
			userId: input.userId,
			familyId: ID.unique(),
		}),
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateClause(input: {
	clause: Clause;
	userId: string;
	data: UpdateClauseInput;
}): Promise<Clause> {
	const plan = planClauseUpdate(input.clause, input.data, input.userId);
	const { tablesDB } = await createAdminClient();

	if (plan.mode === "in-place") {
		const row = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: plan.rowId,
			data: plan.patch,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	}

	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: plan.previousId,
		data: plan.previousPatch,
	});
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: plan.next,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function archiveClause(input: {
	clause: Clause;
	userId: string;
}): Promise<Clause> {
	const plan = planClauseArchive(input.clause, input.userId);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: plan.rowId,
		data: plan.patch,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
