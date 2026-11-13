import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getValidIntegration = vi.fn();
const getCalendarIntegrationStatus = vi.fn();
const getValidGmailAccessToken = vi.fn();
const getGmailIntegrationStatus = vi.fn();
const getValidOutlookMailAccessToken = vi.fn();
const getOutlookMailIntegrationStatus = vi.fn();
const getCrmIntegration = vi.fn();
const getFreshHubSpotAccessToken = vi.fn();
const hubspotGetDeal = vi.fn();
const salesforceGetDeal = vi.fn();
const createDraftFromCrmDeal = vi.fn();
const sendGmailMessage = vi.fn();
const sendOutlookMessage = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/actions/calendar-integration.actions", () => ({
	getValidIntegration: (...args: unknown[]) => getValidIntegration(...args),
	getCalendarIntegrationStatus: (...args: unknown[]) =>
		getCalendarIntegrationStatus(...args),
}));
vi.mock("@/lib/actions/gmail-integration.actions", () => ({
	getValidGmailAccessToken: (...args: unknown[]) =>
		getValidGmailAccessToken(...args),
	getGmailIntegrationStatus: (...args: unknown[]) =>
		getGmailIntegrationStatus(...args),
}));
vi.mock("@/lib/actions/outlook-mail-integration.actions", () => ({
	getValidOutlookMailAccessToken: (...args: unknown[]) =>
		getValidOutlookMailAccessToken(...args),
	getOutlookMailIntegrationStatus: (...args: unknown[]) =>
		getOutlookMailIntegrationStatus(...args),
}));
vi.mock("@/lib/crm/integrations.repository", () => ({
	getCrmIntegration: (...args: unknown[]) => getCrmIntegration(...args),
}));
vi.mock("@/lib/crm/tokens", () => ({
	getFreshHubSpotAccessToken: (...args: unknown[]) =>
		getFreshHubSpotAccessToken(...args),
}));
vi.mock("@/lib/crm/connectors/hubspot.connector", () => ({
	hubspotConnector: {
		getDeal: (...args: unknown[]) => hubspotGetDeal(...args),
	},
}));
vi.mock("@/lib/crm/connectors/salesforce.connector", () => ({
	salesforceConnector: {
		getDeal: (...args: unknown[]) => salesforceGetDeal(...args),
	},
}));
vi.mock("@/lib/crm/create-draft-from-deal", () => ({
	createDraftFromCrmDeal: (...args: unknown[]) =>
		createDraftFromCrmDeal(...args),
}));
vi.mock("@/lib/gmail/client", () => ({
	sendMessage: (...args: unknown[]) => sendGmailMessage(...args),
}));
vi.mock("@/lib/microsoft/mail-client", () => ({
	sendMessage: (...args: unknown[]) => sendOutlookMessage(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { INTEGRATION_TOOLS } = await import("./integrationTools");

function tool(name: string) {
	const found = INTEGRATION_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "user-1", email: "user@org.test", name: "Jamie" },
	} as unknown as Parameters<(typeof INTEGRATION_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("INTEGRATION_TOOLS (12.1-12.5)", () => {
	beforeEach(() => {
		getValidIntegration.mockReset();
		getCalendarIntegrationStatus.mockReset();
		getValidGmailAccessToken.mockReset();
		getGmailIntegrationStatus.mockReset();
		getValidOutlookMailAccessToken.mockReset();
		getOutlookMailIntegrationStatus.mockReset();
		getCrmIntegration.mockReset();
		getFreshHubSpotAccessToken.mockReset();
		hubspotGetDeal.mockReset();
		salesforceGetDeal.mockReset();
		createDraftFromCrmDeal.mockReset();
		sendGmailMessage.mockReset();
		sendOutlookMessage.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("send_gmail", () => {
		it("blocks without integrations.gmail.manage", async () => {
			const res = await tool("send_gmail").handler(ctx([]), {
				to: "a@b.com",
				subject: "Hi",
				body: "Hello",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(sendGmailMessage).not.toHaveBeenCalled();
		});

		it("errors when Gmail isn't connected", async () => {
			getValidGmailAccessToken.mockResolvedValueOnce(null);
			const res = await tool("send_gmail").handler(
				ctx([PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE]),
				{ to: "a@b.com", subject: "Hi", body: "Hello" },
			);
			expect(errorOf(res)).toMatch(/isn't connected/i);
			expect(sendGmailMessage).not.toHaveBeenCalled();
		});

		it("sends via the user's connected Gmail and audits", async () => {
			getValidGmailAccessToken.mockResolvedValueOnce({
				accessToken: "tok",
				email: "me@gmail.com",
			});
			sendGmailMessage.mockResolvedValueOnce({ id: "msg-1" });
			const res = await tool("send_gmail").handler(
				ctx([PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE]),
				{ to: "a@b.com", subject: "Hi", body: "Hello" },
			);
			expect(sendGmailMessage).toHaveBeenCalledWith(
				"tok",
				expect.objectContaining({ to: "a@b.com" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { messageId: string }).messageId).toBe("msg-1");
		});
	});

	describe("send_outlook_mail", () => {
		it("blocks without integrations.outlook.connect", async () => {
			const res = await tool("send_outlook_mail").handler(ctx([]), {
				to: "a@b.com",
				subject: "Hi",
				body: "Hello",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(sendOutlookMessage).not.toHaveBeenCalled();
		});

		it("errors when Outlook isn't connected", async () => {
			getValidOutlookMailAccessToken.mockResolvedValueOnce(null);
			const res = await tool("send_outlook_mail").handler(
				ctx([PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT]),
				{ to: "a@b.com", subject: "Hi", body: "Hello" },
			);
			expect(errorOf(res)).toMatch(/isn't connected/i);
		});

		it("sends via the user's connected Outlook and audits", async () => {
			getValidOutlookMailAccessToken.mockResolvedValueOnce({
				accessToken: "tok",
				email: "me@outlook.com",
			});
			sendOutlookMessage.mockResolvedValueOnce({ id: "msg-2" });
			const res = await tool("send_outlook_mail").handler(
				ctx([PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT]),
				{ to: "a@b.com", subject: "Hi", body: "Hello" },
			);
			expect(sendOutlookMessage).toHaveBeenCalledWith(
				"tok",
				expect.objectContaining({ to: "a@b.com" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { messageId: string }).messageId).toBe("msg-2");
		});
	});

	describe("check_integration_status", () => {
		it("blocks without settings.integrations", async () => {
			const res = await tool("check_integration_status").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(getGmailIntegrationStatus).not.toHaveBeenCalled();
		});

		it("merges gmail/outlook/calendar/crm status", async () => {
			getGmailIntegrationStatus.mockResolvedValueOnce({ connected: true });
			getOutlookMailIntegrationStatus.mockResolvedValueOnce({
				connected: false,
			});
			getCalendarIntegrationStatus.mockResolvedValueOnce({
				connected: true,
				syncEnabled: true,
			});
			getCrmIntegration.mockImplementation(
				async (_orgId: string, provider: string) =>
					provider === "hubspot" ? { status: "connected" } : null,
			);
			const res = await tool("check_integration_status").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS]),
				{},
			);
			const result = res.result as {
				gmail: { connected: boolean };
				crm: { hubspot: { status: string }; salesforce: { status: string } };
			};
			expect(result.gmail.connected).toBe(true);
			expect(result.crm.hubspot.status).toBe("connected");
			expect(result.crm.salesforce.status).toBe("disconnected");
		});
	});

	describe("sync_outlook_calendar", () => {
		it("blocks without integrations.outlook.sync", async () => {
			const res = await tool("sync_outlook_calendar").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
		});

		it("errors when Outlook calendar isn't connected", async () => {
			getValidIntegration.mockResolvedValueOnce(null);
			const res = await tool("sync_outlook_calendar").handler(
				ctx([PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC]),
				{},
			);
			expect(errorOf(res)).toMatch(/isn't connected/i);
		});

		it("returns an honest not-available stub when connected", async () => {
			getValidIntegration.mockResolvedValueOnce({ $id: "cal-1" });
			const res = await tool("sync_outlook_calendar").handler(
				ctx([PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC]),
				{},
			);
			expect((res.result as { available: boolean }).available).toBe(false);
			expect((res.result as { message: string }).message).toMatch(
				/isn't available/i,
			);
		});
	});

	describe("create_crm_draft_from_deal", () => {
		it("blocks without both permissions", async () => {
			const res = await tool("create_crm_draft_from_deal").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS]),
				{ dealId: "d-1" },
			);
			expect(errorOf(res)).toMatch(/permission/i);
			expect(createDraftFromCrmDeal).not.toHaveBeenCalled();
		});

		it("errors when HubSpot isn't connected", async () => {
			getCrmIntegration.mockResolvedValueOnce(null);
			const res = await tool("create_crm_draft_from_deal").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS, PERMISSIONS.CONTRACTS.CREATE]),
				{ dealId: "d-1" },
			);
			expect(errorOf(res)).toMatch(/isn't connected/i);
		});

		it("creates a draft from a HubSpot deal and audits", async () => {
			getCrmIntegration.mockResolvedValueOnce({
				status: "connected",
				config_json: JSON.stringify({ department: "Sales", division: "HQ" }),
			});
			getFreshHubSpotAccessToken.mockResolvedValueOnce("hs-tok");
			hubspotGetDeal.mockResolvedValueOnce({
				provider: "hubspot",
				externalId: "d-1",
				name: "Acme Deal",
			});
			createDraftFromCrmDeal.mockResolvedValueOnce({
				contractId: "c-1",
				alreadyLinked: false,
				payload: { contractName: "Acme Deal" },
			});
			const res = await tool("create_crm_draft_from_deal").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS, PERMISSIONS.CONTRACTS.CREATE]),
				{ dealId: "d-1" },
			);
			expect(createDraftFromCrmDeal).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", provider: "hubspot" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { contractId: string }).contractId).toBe("c-1");
		});

		it("does not re-audit when the deal is already linked", async () => {
			getCrmIntegration.mockResolvedValueOnce({
				status: "connected",
				config_json: "{}",
			});
			getFreshHubSpotAccessToken.mockResolvedValueOnce("hs-tok");
			hubspotGetDeal.mockResolvedValueOnce({
				provider: "hubspot",
				externalId: "d-1",
				name: "Acme Deal",
			});
			createDraftFromCrmDeal.mockResolvedValueOnce({
				contractId: "c-1",
				alreadyLinked: true,
				payload: { contractName: "Acme Deal" },
			});
			const res = await tool("create_crm_draft_from_deal").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS, PERMISSIONS.CONTRACTS.CREATE]),
				{ dealId: "d-1" },
			);
			expect(logAuditEvent).not.toHaveBeenCalled();
			expect((res.result as { alreadyLinked: boolean }).alreadyLinked).toBe(
				true,
			);
		});

		it("surfaces the Salesforce enterprise-setup error honestly", async () => {
			getCrmIntegration.mockResolvedValueOnce({
				status: "connected",
				config_json: "{}",
			});
			salesforceGetDeal.mockRejectedValueOnce(
				new Error(
					"Salesforce requires Enterprise and a guided setup call. We enable your org after sandbox access.",
				),
			);
			const res = await tool("create_crm_draft_from_deal").handler(
				ctx([PERMISSIONS.SETTINGS.INTEGRATIONS, PERMISSIONS.CONTRACTS.CREATE]),
				{ dealId: "d-1", provider: "salesforce" },
			);
			expect(errorOf(res)).toMatch(/enterprise/i);
			expect(createDraftFromCrmDeal).not.toHaveBeenCalled();
		});
	});
});
