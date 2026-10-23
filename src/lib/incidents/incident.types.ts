export type IncidentStatus = "new" | "acknowledged" | "resolved";
export type IncidentScale = "page" | "section" | "table" | "banner";

export interface LoadIncident {
	$id: string;
	reference: string;
	fingerprint: string;
	status: IncidentStatus;
	scale: IncidentScale;
	route: string;
	elementKey: string;
	errorStatus: number | null;
	errorCode: string | null;
	requestPath: string | null;
	traceId: string | null;
	organizationId: string;
	firstUserId: string;
	userAgent: string | null;
	viewport: string | null;
	appVersion: string | null;
	screenshotPath: string | null;
	screenshotCapturedAt: string | null;
	occurrences: number;
	affectedUsers: number;
	firstSeenAt: string;
	lastSeenAt: string;
	assignedTo: string | null;
	acknowledgedBy: string | null;
	acknowledgedAt: string | null;
	resolvedBy: string | null;
	resolvedAt: string | null;
	resolutionNote: string | null;
	reopenedFrom: string | null;
	$createdAt: string;
	$updatedAt: string;
}

export interface LoadIncidentEvent {
	$id: string;
	incidentId: string;
	userId: string;
	occurredAt: string;
	traceId: string | null;
	retryCount: number;
}

/** Fields the client reports when a <LoadError> mounts. */
export interface ReportLoadErrorInput {
	scale: IncidentScale;
	route: string;
	elementKey: string;
	errorStatus?: number;
	errorCode?: string;
	requestPath?: string;
	traceId?: string;
	userAgent?: string;
	viewport?: string;
	appVersion?: string;
	/** Appwrite file id of an uploaded screenshot, if capture succeeded. */
	screenshotFileId?: string;
}
