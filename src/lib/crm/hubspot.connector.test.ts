import { afterEach, describe, expect, it, vi } from "vitest";
import {
	hubspotConnector,
	parseHubSpotDeal,
	parseHubSpotDealProperties,
	parseHubSpotPipelines,
} from "./connectors/hubspot.connector";
import { optionsForCrmFieldMapKey } from "./types";

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

	it("parses deal properties and skips hidden/calculated", () => {
		const properties = parseHubSpotDealProperties({
			results: [
				{ name: "dealname", label: "Deal Name", type: "string", fieldType: "text" },
				{ name: "amount", label: "Amount", type: "number", fieldType: "number" },
				{ name: "hs_hidden", label: "Hidden", hidden: true },
				{ name: "hs_calc", label: "Calc", calculated: true },
			],
		});
		// Sorted by label: Amount, Deal Name
		expect(properties.map((p) => p.name)).toEqual(["amount", "dealname"]);
		expect(properties[0].type).toBe("number");
		expect(properties[1].type).toBe("string");
	});

	it("filters mapping options by field type and keeps defaults first", () => {
		const properties = parseHubSpotDealProperties({
			results: [
				{ name: "dealname", label: "Deal Name", type: "string", fieldType: "text" },
				{
					name: "closed_lost_reason",
					label: "Closed Lost Reason",
					type: "string",
					fieldType: "textarea",
				},
				{ name: "amount", label: "Amount", type: "number", fieldType: "number" },
				{
					name: "hs_weighted_amount",
					label: "Weighted amount",
					type: "number",
					fieldType: "number",
				},
				{
					name: "hs_created_by_user_id",
					label: "Created by user ID",
					type: "number",
					fieldType: "number",
				},
				{
					name: "hs_deal_score",
					label: "Deal Score",
					type: "number",
					fieldType: "number",
				},
				{ name: "closedate", label: "Close Date", type: "date", fieldType: "date" },
				{
					name: "engagements_last_meeting_booked",
					label: "Date of last meeting booked in meetings tool",
					type: "date",
					fieldType: "date",
				},
				{
					name: "hubspot_owner_id",
					label: "Deal owner",
					type: "enumeration",
					fieldType: "select",
				},
				{
					name: "hs_average_deal_owner_duration_in_current_stage",
					label: "Average Deal Owner Duration In Current Stage",
					type: "number",
					fieldType: "number",
				},
				{
					name: "hs_v2_cumulative_time_in_closedwon",
					label: 'Cumulative time in "Closed Won"',
					type: "number",
					fieldType: "number",
				},
				{
					name: "company",
					label: "Company Name",
					type: "string",
					fieldType: "text",
				},
			],
		});

		const nameOptions = optionsForCrmFieldMapKey("dealName", properties);
		expect(nameOptions.map((p) => p.name)).toEqual(["dealname"]);

		const amountOptions = optionsForCrmFieldMapKey("amount", properties);
		expect(amountOptions.map((p) => p.name)).toEqual([
			"amount",
			"hs_weighted_amount",
		]);

		const dateOptions = optionsForCrmFieldMapKey("closeDate", properties);
		expect(dateOptions.map((p) => p.name)).toEqual(["closedate"]);

		const ownerOptions = optionsForCrmFieldMapKey("owner", properties);
		expect(ownerOptions.map((p) => p.name)).toEqual(["hubspot_owner_id"]);

		const companyOptions = optionsForCrmFieldMapKey("company", properties);
		expect(companyOptions.map((p) => p.name)).toEqual(["company"]);
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

	it("uses org field mapping for custom HubSpot property names", () => {
		const deal = parseHubSpotDeal(
			{
				id: "77",
				properties: {
					caalm_title: "Mapped MSA",
					contract_value: "88000",
					vendor_name: "Northwind",
					owner_email: "pat@example.com",
					target_close: "2026-12-01",
					dealstage: "contractsent",
					pipeline: "default",
				},
			},
			{
				dealName: "caalm_title",
				amount: "contract_value",
				company: "vendor_name",
				owner: "owner_email",
				closeDate: "target_close",
			},
		);
		expect(deal.name).toBe("Mapped MSA");
		expect(deal.amount).toBe(88000);
		expect(deal.companyName).toBe("Northwind");
		expect(deal.ownerName).toBe("pat@example.com");
		expect(deal.closeDate).toBe("2026-12-01");
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
