import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const fetchBriefing = vi.fn();
const listNewsArticles = vi.fn();
const getUserRoles = vi.fn();
const getNotifications = vi.fn();
const markAsRead = vi.fn();
const getNotificationSettings = vi.fn();
const isConfigured = vi.fn();
const formatPhoneNumber = vi.fn();
const sendSMS = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/briefing/fetch-briefing", () => ({
	fetchBriefing: (...args: unknown[]) => fetchBriefing(...args),
}));
vi.mock("@/lib/database/news-articles", () => ({
	listNewsArticles: (...args: unknown[]) => listNewsArticles(...args),
}));
vi.mock("@/lib/rbac/permissions", () => ({
	getUserRoles: (...args: unknown[]) => getUserRoles(...args),
}));
vi.mock("@/lib/services/notificationService", () => ({
	notificationService: {
		getNotifications: (...args: unknown[]) => getNotifications(...args),
		markAsRead: (...args: unknown[]) => markAsRead(...args),
		getNotificationSettings: (...args: unknown[]) =>
			getNotificationSettings(...args),
	},
}));
vi.mock("@/lib/services/twilioService", () => ({
	twilioService: {
		isConfigured: (...args: unknown[]) => isConfigured(...args),
		formatPhoneNumber: (...args: unknown[]) => formatPhoneNumber(...args),
		sendSMS: (...args: unknown[]) => sendSMS(...args),
	},
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { NEWS_TOOLS } = await import("./newsTools");

function tool(name: string) {
	const found = NEWS_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: {
			$id: "user-1",
			email: "user@org.test",
			name: "Jamie",
			department: "Sales",
		},
	} as unknown as Parameters<(typeof NEWS_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("NEWS_TOOLS (13.1-13.3)", () => {
	beforeEach(() => {
		fetchBriefing.mockReset();
		listNewsArticles.mockReset();
		getUserRoles.mockReset().mockResolvedValue([]);
		getNotifications.mockReset();
		markAsRead.mockReset();
		getNotificationSettings.mockReset();
		isConfigured.mockReset().mockReturnValue(true);
		formatPhoneNumber.mockReset().mockImplementation((n: string) => n);
		sendSMS.mockReset().mockResolvedValue(true);
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("get_morning_briefing", () => {
		it("blocks without ai.chat", async () => {
			const res = await tool("get_morning_briefing").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(fetchBriefing).not.toHaveBeenCalled();
		});

		it("combines world briefing with the org's published company news", async () => {
			fetchBriefing.mockResolvedValueOnce({
				markets: [
					{
						name: "S&P 500",
						ticker: "^GSPC",
						price: 1,
						changePercent: 1,
						sparkline: [],
					},
				],
				news: [
					{
						id: "n-1",
						title: "World thing happened",
						source: "BBC",
						feed: "bbc",
						publishedAt: "2026-01-01",
						imageUrl: null,
						videoUrl: null,
						excerpt: null,
						articleUrl: "https://bbc.com/x",
					},
				],
			});
			listNewsArticles.mockResolvedValueOnce({
				articles: [
					{ $id: "a-1", title: "Org update", content: "Body", author: "IT" },
				],
				total: 1,
			});
			const res = await tool("get_morning_briefing").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{},
			);
			expect(listNewsArticles).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					status: "published",
					forReader: true,
				}),
			);
			const result = res.result as {
				markets: unknown[];
				worldNews: unknown[];
				companyNews: Array<{ title: string }>;
			};
			expect(result.markets).toHaveLength(1);
			expect(result.worldNews).toHaveLength(1);
			expect(result.companyNews[0].title).toBe("Org update");
		});
	});

	describe("list_notifications", () => {
		it("blocks without ai.chat", async () => {
			const res = await tool("list_notifications").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(getNotifications).not.toHaveBeenCalled();
		});

		it("lists only the caller's own notifications", async () => {
			getNotifications.mockResolvedValueOnce({
				data: [
					{
						$id: "note-1",
						userId: "user-1",
						title: "Hi",
						message: "Body",
						type: "info",
						read: false,
						$createdAt: "2026-01-01",
					},
				],
				total: 1,
			});
			const res = await tool("list_notifications").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{},
			);
			expect(getNotifications).toHaveBeenCalledWith(
				"user-1",
				expect.anything(),
				undefined,
				1,
				expect.any(Number),
			);
			expect((res.result as { total: number }).total).toBe(1);
		});

		it("refuses to mark read a notification that isn't the caller's own", async () => {
			getNotifications.mockResolvedValueOnce({ data: [], total: 0 });
			const res = await tool("list_notifications").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ action: "mark_read", notificationId: "someone-elses" },
			);
			expect(errorOf(res)).toMatch(/couldn't find/i);
			expect(markAsRead).not.toHaveBeenCalled();
		});

		it("marks the caller's own notification read", async () => {
			getNotifications.mockResolvedValueOnce({
				data: [{ $id: "note-1", userId: "user-1" }],
				total: 1,
			});
			markAsRead.mockResolvedValueOnce({ $id: "note-1", read: true });
			const res = await tool("list_notifications").handler(
				ctx([PERMISSIONS.AI.CHAT]),
				{ action: "mark_read", notificationId: "note-1" },
			);
			expect(markAsRead).toHaveBeenCalledWith("note-1");
			expect((res.result as { read: boolean }).read).toBe(true);
		});
	});

	describe("send_sms_test", () => {
		it("blocks without settings.edit", async () => {
			const res = await tool("send_sms_test").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(sendSMS).not.toHaveBeenCalled();
		});

		it("returns an honest stub when Twilio isn't configured", async () => {
			isConfigured.mockReturnValueOnce(false);
			const res = await tool("send_sms_test").handler(
				ctx([PERMISSIONS.SETTINGS.EDIT]),
				{},
			);
			expect((res.result as { available: boolean }).available).toBe(false);
			expect(sendSMS).not.toHaveBeenCalled();
		});

		it("errors when the caller has no phone number on file", async () => {
			getNotificationSettings.mockResolvedValueOnce(null);
			const res = await tool("send_sms_test").handler(
				ctx([PERMISSIONS.SETTINGS.EDIT]),
				{},
			);
			expect(errorOf(res)).toMatch(/no phone number on file/i);
			expect(sendSMS).not.toHaveBeenCalled();
		});

		it("sends only to the caller's own on-file number and audits", async () => {
			getNotificationSettings.mockResolvedValueOnce({
				phone_number: "+15551234567",
			});
			const res = await tool("send_sms_test").handler(
				ctx([PERMISSIONS.SETTINGS.EDIT]),
				{},
			);
			expect(sendSMS).toHaveBeenCalledWith(
				expect.objectContaining({ to: "+15551234567" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { success: boolean }).success).toBe(true);
		});
	});
});
