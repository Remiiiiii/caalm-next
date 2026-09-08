import type { CrmOriginConnector } from "./types";
import { EnterpriseSetupRequiredError } from "./types";

function refuse(): never {
	throw new EnterpriseSetupRequiredError();
}

/** Mold only — no Salesforce API calls until a paid Enterprise setup. */
export const salesforceConnector: CrmOriginConnector = {
	getAuthUrl() {
		return refuse();
	},
	exchangeCode() {
		return refuse();
	},
	refreshTokens() {
		return refuse();
	},
	listPipelines() {
		return refuse();
	},
	listDealProperties() {
		return refuse();
	},
	getDeal() {
		return refuse();
	},
	searchDealsByStage() {
		return refuse();
	},
	verifyConnection() {
		return refuse();
	},
};
