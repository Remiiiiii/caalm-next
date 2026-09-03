import type {
	CrmConnectionInfo,
	CrmDealSnapshot,
	CrmPipeline,
	CrmTokens,
} from "../types";

export class EnterpriseSetupRequiredError extends Error {
	readonly status = 403;
	readonly code = "ENTERPRISE_SETUP_REQUIRED";

	constructor(
		message = "Salesforce requires Enterprise and a guided setup call. We enable your org after sandbox access.",
	) {
		super(message);
		this.name = "EnterpriseSetupRequiredError";
	}
}

export interface CrmOriginConnector {
	getAuthUrl(state: string): string;
	exchangeCode(code: string): Promise<CrmTokens & CrmConnectionInfo>;
	refreshTokens(refreshToken: string): Promise<CrmTokens>;
	listPipelines(accessToken: string): Promise<CrmPipeline[]>;
	getDeal(accessToken: string, dealId: string): Promise<CrmDealSnapshot>;
	searchDealsByStage(
		accessToken: string,
		pipelineId: string,
		stageId: string,
	): Promise<CrmDealSnapshot[]>;
	verifyConnection(accessToken: string): Promise<CrmConnectionInfo>;
}
