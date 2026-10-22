import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	LoadIncident,
	LoadIncidentEvent,
	ReportLoadErrorInput,
} from "./incident.types";
import {
	computeFingerprint,
	generateIncidentReference,
} from "./incident.utils";

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

function incidentsTable(): string {
	return appwriteConfig.uiLoadIncidentsCollectionId || "ui_load_incidents";
}

function eventsTable(): string {
	return (
		appwriteConfig.uiLoadIncidentEventsCollectionId || "ui_load_incident_events"
	);
}

/**
 * Reports one occurrence of a load failure. Upserts by fingerprint among
 * non-resolved incidents: increments counters on a match, opens a new
 * (possibly reopened) incident otherwise. Always inserts an event row.
 */
export async function reportLoadError(
	input: ReportLoadErrorInput & { organizationId: string; userId: string },
): Promise<LoadIncident> {
	const { tablesDB } = await createAdminClient();
	const now = new Date().toISOString();
	const fingerprint = computeFingerprint(input);

	const existing = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: incidentsTable(),
		queries: [
			Query.equal("fingerprint", fingerprint),
			Query.notEqual("status", "resolved"),
			Query.orderDesc("$createdAt"),
			Query.limit(1),
		],
	});

	let incident: LoadIncident;

	if (existing.rows.length > 0) {
		const row = existing.rows[0] as unknown as LoadIncident;
		const seenThisUser = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: eventsTable(),
			queries: [
				Query.equal("incidentId", row.$id),
				Query.equal("userId", input.userId),
				Query.limit(1),
			],
		});
		const updated = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: incidentsTable(),
			rowId: row.$id,
			data: {
				occurrences: row.occurrences + 1,
				affectedUsers:
					seenThisUser.rows.length === 0
						? row.affectedUsers + 1
						: row.affectedUsers,
				lastSeenAt: now,
				...(input.screenshotFileId && !row.screenshotPath
					? {
							screenshotPath: input.screenshotFileId,
							screenshotCapturedAt: now,
						}
					: {}),
			},
		});
		incident = updated as unknown as LoadIncident;
	} else {
		// A resolved incident with the same fingerprint, if any, is linked as
		// the regression source rather than silently reused.
		const resolved = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: incidentsTable(),
			queries: [
				Query.equal("fingerprint", fingerprint),
				Query.equal("status", "resolved"),
				Query.orderDesc("resolvedAt"),
				Query.limit(1),
			],
		});

		const created = await tablesDB.createRow({
			databaseId: dbId(),
			tableId: incidentsTable(),
			rowId: ID.unique(),
			data: {
				reference: generateIncidentReference(),
				fingerprint,
				status: "new",
				scale: input.scale,
				route: input.route,
				elementKey: input.elementKey,
				errorStatus: input.errorStatus ?? null,
				errorCode: input.errorCode ?? null,
				requestPath: input.requestPath ?? null,
				traceId: input.traceId ?? null,
				organizationId: input.organizationId,
				firstUserId: input.userId,
				userAgent: input.userAgent ?? null,
				viewport: input.viewport ?? null,
				appVersion: input.appVersion ?? null,
				screenshotPath: input.screenshotFileId ?? null,
				screenshotCapturedAt: input.screenshotFileId ? now : null,
				occurrences: 1,
				affectedUsers: 1,
				firstSeenAt: now,
				lastSeenAt: now,
				reopenedFrom: resolved.rows[0]?.$id ?? null,
			},
		});
		incident = created as unknown as LoadIncident;
	}

	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: eventsTable(),
		rowId: ID.unique(),
		data: {
			incidentId: incident.$id,
			userId: input.userId,
			occurredAt: now,
			traceId: input.traceId ?? null,
			retryCount: 0,
		},
	});

	return incident;
}

export async function listActiveIncidents(options: {
	organizationId?: string;
	search?: string;
	scale?: string;
	assignedTo?: string;
	limit?: number;
}): Promise<LoadIncident[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.notEqual("status", "resolved"),
		Query.orderDesc("lastSeenAt"),
		Query.limit(options.limit ?? 100),
	];
	if (options.organizationId) {
		queries.push(Query.equal("organizationId", options.organizationId));
	}
	if (options.scale) queries.push(Query.equal("scale", options.scale));
	if (options.assignedTo) {
		queries.push(Query.equal("assignedTo", options.assignedTo));
	}
	if (options.search) queries.push(Query.search("route", options.search));

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: incidentsTable(),
		queries,
	});
	return result.rows as unknown as LoadIncident[];
}

export async function getIncidentById(
	incidentId: string,
): Promise<LoadIncident | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: incidentsTable(),
			rowId: incidentId,
		});
		return row as unknown as LoadIncident;
	} catch {
		return null;
	}
}

export async function updateIncident(
	incidentId: string,
	data: Partial<
		Pick<
			LoadIncident,
			| "status"
			| "assignedTo"
			| "acknowledgedBy"
			| "acknowledgedAt"
			| "resolvedBy"
			| "resolvedAt"
			| "resolutionNote"
		>
	>,
): Promise<LoadIncident> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: incidentsTable(),
		rowId: incidentId,
		data,
	});
	return row as unknown as LoadIncident;
}

export async function listIncidentEvents(
	incidentId: string,
): Promise<LoadIncidentEvent[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: eventsTable(),
		queries: [
			Query.equal("incidentId", incidentId),
			Query.orderDesc("occurredAt"),
			Query.limit(50),
		],
	});
	return result.rows as unknown as LoadIncidentEvent[];
}
