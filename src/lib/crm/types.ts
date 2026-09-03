export type CrmProvider = "hubspot" | "salesforce";

export type CrmIntegrationStatus =
	| "connected"
	| "disconnected"
	| "error"
	| "pending_setup";

export type CrmFieldMap = {
	dealName: string;
	amount: string;
	company: string;
	owner: string;
	closeDate: string;
};

export const DEFAULT_CRM_FIELD_MAP: CrmFieldMap = {
	dealName: "dealname",
	amount: "amount",
	company: "company",
	owner: "hubspot_owner_id",
	closeDate: "closedate",
};

export type CrmIntegrationConfig = {
	pipelineId: string;
	triggerStageId: string;
	fieldMap: CrmFieldMap;
	enabled: boolean;
};

export function defaultCrmIntegrationConfig(): CrmIntegrationConfig {
	return {
		pipelineId: "",
		triggerStageId: "",
		fieldMap: { ...DEFAULT_CRM_FIELD_MAP },
		enabled: true,
	};
}

export type CrmDealSnapshot = {
	provider: CrmProvider;
	externalId: string;
	name: string;
	amount: number | null;
	currency: string;
	companyName: string | null;
	ownerName: string | null;
	stageId: string | null;
	pipelineId: string | null;
	closeDate: string | null;
	raw: Record<string, string | null>;
};

export type CrmPipelineStage = {
	id: string;
	label: string;
};

export type CrmPipeline = {
	id: string;
	label: string;
	stages: CrmPipelineStage[];
};

export type CrmTokens = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

export type CrmConnectionInfo = {
	portalId?: string;
	displayName?: string;
};

export type CrmIntegrationRecord = {
	$id: string;
	orgId: string;
	provider: CrmProvider;
	status: CrmIntegrationStatus;
	tokens_json?: string;
	token_expiry?: string;
	portal_id?: string;
	config_json?: string;
	connected_by?: string;
	connected_at?: string;
	last_sync_at?: string;
	last_error?: string;
};

export type CrmOriginLink = {
	$id: string;
	orgId: string;
	provider: CrmProvider;
	external_id: string;
	contract_id: string;
	created_at: string;
};

export function parseCrmConfig(
	raw: string | undefined | null,
): CrmIntegrationConfig {
	const fallback = defaultCrmIntegrationConfig();
	if (!raw) return fallback;
	try {
		const parsed = JSON.parse(raw) as Partial<CrmIntegrationConfig>;
		return {
			pipelineId:
				typeof parsed.pipelineId === "string"
					? parsed.pipelineId
					: fallback.pipelineId,
			triggerStageId:
				typeof parsed.triggerStageId === "string"
					? parsed.triggerStageId
					: fallback.triggerStageId,
			fieldMap: { ...fallback.fieldMap, ...parsed.fieldMap },
			enabled: parsed.enabled !== false,
		};
	} catch {
		return fallback;
	}
}

export function crmReferenceFor(
	provider: CrmProvider,
	externalId: string,
): string {
	return `${provider}:${externalId}`;
}

export function parseCrmTokens(
	raw: string | undefined | null,
): CrmTokens | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<CrmTokens>;
		if (!parsed.access_token) return null;
		return {
			access_token: parsed.access_token,
			refresh_token: parsed.refresh_token || "",
			expires_in: Number(parsed.expires_in) || 0,
		};
	} catch {
		return null;
	}
}
