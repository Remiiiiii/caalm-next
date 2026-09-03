import { getAppUrl } from "@/lib/config/environment";
import type {
	CrmConnectionInfo,
	CrmDealProperty,
	CrmDealSnapshot,
	CrmFieldMap,
	CrmPipeline,
	CrmTokens,
} from "../types";
import { DEFAULT_CRM_FIELD_MAP } from "../types";
import type { CrmOriginConnector } from "./types";

const HUBSPOT_AUTHORIZE = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_API = "https://api.hubapi.com";

export const HUBSPOT_SCOPES = [
	"crm.objects.deals.read",
	"crm.objects.companies.read",
	"crm.schemas.deals.read",
] as const;

export function getHubSpotRedirectUri(): string {
	return (
		process.env.HUBSPOT_REDIRECT_URI ||
		`${getAppUrl()}/api/hubspot/callback`
	);
}

export function validateHubSpotConfig(): void {
	if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET) {
		throw new Error(
			"Missing required HubSpot OAuth configuration: HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET",
		);
	}
}

type HubSpotPipelineResponse = {
	results?: Array<{
		id?: string;
		label?: string;
		stages?: Array<{ id?: string; label?: string }>;
	}>;
};

type HubSpotDealResponse = {
	id?: string;
	properties?: Record<string, string | null | undefined>;
};

type HubSpotSearchResponse = {
	results?: HubSpotDealResponse[];
};

type HubSpotTokenInfo = {
	hub_id?: number;
	hubId?: number;
	user?: string;
};

type HubSpotPropertiesResponse = {
	results?: Array<{
		name?: string;
		label?: string;
		type?: string;
		fieldType?: string;
		hidden?: boolean;
		calculated?: boolean;
	}>;
};

function resolveFieldMap(fieldMap?: CrmFieldMap): CrmFieldMap {
	return fieldMap
		? { ...DEFAULT_CRM_FIELD_MAP, ...fieldMap }
		: DEFAULT_CRM_FIELD_MAP;
}

function dealPropertyList(fieldMap: CrmFieldMap): string[] {
	return [
		fieldMap.dealName,
		fieldMap.amount,
		fieldMap.company,
		fieldMap.owner,
		fieldMap.closeDate,
		"dealstage",
		"pipeline",
	].filter(Boolean);
}

export function parseHubSpotPipelines(
	payload: HubSpotPipelineResponse,
): CrmPipeline[] {
	return (payload.results || []).map((pipeline) => ({
		id: String(pipeline.id || ""),
		label: pipeline.label || String(pipeline.id || "Pipeline"),
		stages: (pipeline.stages || []).map((stage) => ({
			id: String(stage.id || ""),
			label: stage.label || String(stage.id || "Stage"),
		})),
	}));
}

export function parseHubSpotDealProperties(
	payload: HubSpotPropertiesResponse,
): CrmDealProperty[] {
	return (payload.results || [])
		.filter((property) => {
			const name = property.name?.trim();
			if (!name) return false;
			// Skip HubSpot-internal calc/hidden fields that aren't useful for mapping
			if (property.hidden || property.calculated) return false;
			return /^[a-zA-Z0-9_-]+$/.test(name);
		})
		.map((property) => ({
			name: String(property.name),
			label: property.label?.trim() || String(property.name),
			type: (property.type || "").toLowerCase(),
			fieldType: (property.fieldType || "").toLowerCase(),
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function parseHubSpotDeal(
	payload: HubSpotDealResponse,
	fieldMap?: CrmFieldMap,
): CrmDealSnapshot {
	const map = resolveFieldMap(fieldMap);
	const properties = payload.properties || {};
	const amountRaw = properties[map.amount];
	const amount = amountRaw ? Number(amountRaw) : null;
	return {
		provider: "hubspot",
		externalId: String(payload.id || ""),
		name: properties[map.dealName] || "Untitled deal",
		amount: Number.isFinite(amount) ? amount : null,
		currency: "USD",
		companyName: properties[map.company] || null,
		ownerName: properties[map.owner] || null,
		stageId: properties.dealstage || null,
		pipelineId: properties.pipeline || null,
		closeDate: properties[map.closeDate] || null,
		raw: Object.fromEntries(
			Object.entries(properties).map(([key, value]) => [key, value ?? null]),
		),
	};
}

async function hubspotJson<T>(
	url: string,
	accessToken: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`HubSpot API ${response.status}: ${error}`);
	}
	return response.json() as Promise<T>;
}

async function exchangeOrRefresh(
	body: URLSearchParams,
): Promise<CrmTokens> {
	validateHubSpotConfig();
	const response = await fetch(HUBSPOT_TOKEN, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`HubSpot token exchange failed: ${error}`);
	}
	const json = (await response.json()) as CrmTokens;
	return {
		access_token: json.access_token,
		refresh_token: json.refresh_token,
		expires_in: Number(json.expires_in) || 1800,
	};
}

export async function fetchHubSpotTokenInfo(
	accessToken: string,
): Promise<CrmConnectionInfo> {
	const info = await hubspotJson<HubSpotTokenInfo>(
		`${HUBSPOT_API}/oauth/v1/access-tokens/${accessToken}`,
		accessToken,
	);
	const portalId = String(info.hub_id || info.hubId || "");
	return {
		portalId: portalId || undefined,
		displayName: info.user || (portalId ? `Hub ${portalId}` : "HubSpot"),
	};
}

export const hubspotConnector: CrmOriginConnector = {
	getAuthUrl(state: string): string {
		validateHubSpotConfig();
		const params = new URLSearchParams({
			client_id: process.env.HUBSPOT_CLIENT_ID || "",
			redirect_uri: getHubSpotRedirectUri(),
			scope: HUBSPOT_SCOPES.join(" "),
			state,
		});
		return `${HUBSPOT_AUTHORIZE}?${params.toString()}`;
	},

	async exchangeCode(code: string): Promise<CrmTokens & CrmConnectionInfo> {
		const tokens = await exchangeOrRefresh(
			new URLSearchParams({
				grant_type: "authorization_code",
				client_id: process.env.HUBSPOT_CLIENT_ID || "",
				client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
				redirect_uri: getHubSpotRedirectUri(),
				code,
			}),
		);
		const connection = await fetchHubSpotTokenInfo(tokens.access_token);
		return { ...tokens, ...connection };
	},

	async refreshTokens(refreshToken: string): Promise<CrmTokens> {
		return exchangeOrRefresh(
			new URLSearchParams({
				grant_type: "refresh_token",
				client_id: process.env.HUBSPOT_CLIENT_ID || "",
				client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
				refresh_token: refreshToken,
			}),
		);
	},

	async listPipelines(accessToken: string): Promise<CrmPipeline[]> {
		const payload = await hubspotJson<HubSpotPipelineResponse>(
			`${HUBSPOT_API}/crm/v3/pipelines/deals`,
			accessToken,
		);
		return parseHubSpotPipelines(payload);
	},

	async listDealProperties(accessToken: string): Promise<CrmDealProperty[]> {
		const payload = await hubspotJson<HubSpotPropertiesResponse>(
			`${HUBSPOT_API}/crm/v3/properties/deals`,
			accessToken,
		);
		return parseHubSpotDealProperties(payload);
	},

	async getDeal(
		accessToken: string,
		dealId: string,
		fieldMap?: CrmFieldMap,
	): Promise<CrmDealSnapshot> {
		const map = resolveFieldMap(fieldMap);
		const properties = dealPropertyList(map).join(",");
		const payload = await hubspotJson<HubSpotDealResponse>(
			`${HUBSPOT_API}/crm/v3/objects/deals/${encodeURIComponent(dealId)}?properties=${properties}`,
			accessToken,
		);
		return parseHubSpotDeal(payload, map);
	},

	async searchDealsByStage(
		accessToken: string,
		pipelineId: string,
		stageId: string,
		fieldMap?: CrmFieldMap,
	): Promise<CrmDealSnapshot[]> {
		const map = resolveFieldMap(fieldMap);
		const filters: Array<{
			propertyName: string;
			operator: string;
			value: string;
		}> = [
			{
				propertyName: "dealstage",
				operator: "EQ",
				value: stageId,
			},
		];
		if (pipelineId) {
			filters.push({
				propertyName: "pipeline",
				operator: "EQ",
				value: pipelineId,
			});
		}
		const payload = await hubspotJson<HubSpotSearchResponse>(
			`${HUBSPOT_API}/crm/v3/objects/deals/search`,
			accessToken,
			{
				method: "POST",
				body: JSON.stringify({
					filterGroups: [{ filters }],
					properties: dealPropertyList(map),
					limit: 50,
				}),
			},
		);
		return (payload.results || []).map((row) => parseHubSpotDeal(row, map));
	},

	async verifyConnection(accessToken: string): Promise<CrmConnectionInfo> {
		return fetchHubSpotTokenInfo(accessToken);
	},
};
