import { describe, expect, it } from "vitest";
import { salesforceConnector } from "./connectors/salesforce.connector";
import { EnterpriseSetupRequiredError } from "./connectors/types";

describe("Salesforce connector mold", () => {
	it("refuses every method until Enterprise setup", () => {
		expect(() => salesforceConnector.getAuthUrl("state")).toThrow(
			EnterpriseSetupRequiredError,
		);
	});
});
