import { afterEach, describe, expect, it, vi } from "vitest";
import {
	hubspotConnector,
	parseHubSpotDeal,
	parseHubSpotPipelines,
} from "./connectors/hubspot.connector";

describe("HubSpot connector parsers", () => {
	it("parses pipelines and stages", () => {
		const pipelines = parseHubSpotPipelines({
			results: [
				{
					id: "default",
					label: "Sales Pipeline",
					stages: [
						{ id: "appointmentscheduled", label: "Appointment Scheduled" },
						{ id: "closedwon", label: "Closed Won" },
					],
				},
			],
		});
		expect(pipelines).toHaveLength(1);
		expect(pipelines[0].stages[1].id).toBe("closedwon");
	});

	it("parses a deal snapshot", () => {
		const deal = parseHubSpotDeal({
			id: "99",
			properties: {
				dealname: "Widget renewal",
				amount: "1200",
				dealstage: "closedwon",
				pipeline: "default",
			},
		});
		expect(deal.externalId).toBe("99");
		expect(deal.name).toBe("Widget renewal");
		expect(deal.amount).toBe(1200);
		expect(deal.stageId).toBe("closedwon");
	});
});

describe("HubSpot token refresh", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("posts refresh_token grant and returns tokens", async () => {
		process.env.HUBSPOT_CLIENT_ID = "client";
		process.env.HUBSPOT_CLIENT_SECRET = "secret";
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				access_token: "new-access",
				refresh_token: "new-refresh",
				expires_in: 1800,
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const tokens = await hubspotConnector.refreshTokens("old-refresh");
		expect(tokens.access_token).toBe("new-access");
		expect(tokens.refresh_token).toBe("new-refresh");
		expect(fetchMock).toHaveBeenCalledOnce();
		const body = String(fetchMock.mock.calls[0][1]?.body);
		expect(body).toContain("grant_type=refresh_token");
		expect(body).toContain("refresh_token=old-refresh");
	});
});
