import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getConstituentById = vi.fn();
const listConstituents = vi.fn();
const createConstituentWithDuplicateGate = vi.fn();
const createRelationship = vi.fn();
const createDraftGift = vi.fn();
const postGift = vi.fn();
const listGifts = vi.fn();
const getOrCreateDraft = vi.fn();
const updateDraft = vi.fn();
const publish = vi.fn();
const getPublished = vi.fn();
const createPreviewToken = vi.fn();
const getOrganization = vi.fn();
const listVolunteerShiftsForOrg = vi.fn();
const getVolunteerShiftById = vi.fn();
const bookVolunteerOnShift = vi.fn();
const logAuditEvent = vi.fn();
const getSegmentForConstituent = vi.fn();
const getLatestWealthScreen = vi.fn();

vi.mock("@/lib/constituents/repository", () => ({
	getConstituentById: (...args: unknown[]) => getConstituentById(...args),
	listConstituents: (...args: unknown[]) => listConstituents(...args),
}));
vi.mock("@/lib/constituents/create-constituent.service", () => ({
	createConstituentWithDuplicateGate: (...args: unknown[]) =>
		createConstituentWithDuplicateGate(...args),
}));
vi.mock("@/lib/constituents/relationships", () => ({
	createRelationship: (...args: unknown[]) => createRelationship(...args),
}));
vi.mock("@/lib/gifts/repository", async () => {
	const actual = await vi.importActual<typeof import("@/lib/gifts/repository")>(
		"@/lib/gifts/repository",
	);
	return {
		...actual,
		createDraftGift: (...args: unknown[]) => createDraftGift(...args),
		postGift: (...args: unknown[]) => postGift(...args),
		listGifts: (...args: unknown[]) => listGifts(...args),
	};
});
vi.mock("@/lib/give/donation-page-config/runtime", () => ({
	getDonationPageConfigService: () => ({
		getOrCreateDraft: (...args: unknown[]) => getOrCreateDraft(...args),
		updateDraft: (...args: unknown[]) => updateDraft(...args),
		publish: (...args: unknown[]) => publish(...args),
		getPublished: (...args: unknown[]) => getPublished(...args),
		createPreviewToken: (...args: unknown[]) => createPreviewToken(...args),
	}),
}));
vi.mock("@/lib/rbac/organizations", () => ({
	getOrganization: (...args: unknown[]) => getOrganization(...args),
}));
vi.mock("@/lib/volunteers/volunteer-shifts.service", () => ({
	listVolunteerShiftsForOrg: (...args: unknown[]) =>
		listVolunteerShiftsForOrg(...args),
	getVolunteerShiftById: (...args: unknown[]) => getVolunteerShiftById(...args),
}));
vi.mock("@/lib/volunteers/shift-bookings.repository", () => ({
	bookVolunteerOnShift: (...args: unknown[]) => bookVolunteerOnShift(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/fundraising/segments-repository", () => ({
	getSegmentForConstituent: (...args: unknown[]) =>
		getSegmentForConstituent(...args),
}));
vi.mock("@/lib/fundraising/wealth-repository", () => ({
	getLatestWealthScreen: (...args: unknown[]) => getLatestWealthScreen(...args),
}));

const { CONSTITUENT_TOOLS } = await import("./constituentTools");

function tool(name: string) {
	const found = CONSTITUENT_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof CONSTITUENT_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const constituentRow = {
	$id: "c-1",
	orgId: "org-1",
	firstName: "Jane",
	lastName: "Doe",
	type: "donor",
};

describe("CONSTITUENT_TOOLS (8.1-8.5)", () => {
	beforeEach(() => {
		getConstituentById.mockReset();
		listConstituents.mockReset();
		createConstituentWithDuplicateGate.mockReset();
		createRelationship.mockReset();
		createDraftGift.mockReset();
		postGift.mockReset();
		listGifts.mockReset();
		getOrCreateDraft.mockReset();
		updateDraft.mockReset();
		publish.mockReset();
		getPublished.mockReset();
		createPreviewToken.mockReset();
		getOrganization.mockReset();
		listVolunteerShiftsForOrg.mockReset();
		getVolunteerShiftById.mockReset();
		bookVolunteerOnShift.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		getSegmentForConstituent.mockReset();
		getLatestWealthScreen.mockReset();
	});

	describe("search_constituents", () => {
		it("blocks viewing without constituents.view", async () => {
			const res = await tool("search_constituents").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listConstituents).not.toHaveBeenCalled();
		});

		it("denies a constituent from another org", async () => {
			getConstituentById.mockResolvedValueOnce({
				...constituentRow,
				orgId: "org-2",
			});
			const res = await tool("search_constituents").handler(
				ctx([PERMISSIONS.CONSTITUENTS.VIEW]),
				{ constituentId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no constituent found/i);
		});

		it("blocks creating without constituents.manage", async () => {
			const res = await tool("search_constituents").handler(ctx([]), {
				create: true,
				firstName: "Jane",
				lastName: "Doe",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createConstituentWithDuplicateGate).not.toHaveBeenCalled();
		});

		it("flags duplicates instead of creating", async () => {
			createConstituentWithDuplicateGate.mockResolvedValueOnce({
				ok: false,
				status: 409,
				candidates: [{ $id: "c-2" }],
			});
			const res = await tool("search_constituents").handler(
				ctx([PERMISSIONS.CONSTITUENTS.MANAGE]),
				{ create: true, firstName: "Jane", lastName: "Doe" },
			);
			expect(errorOf(res)).toMatch(/duplicate/i);
			expect(logAuditEvent).not.toHaveBeenCalled();
		});

		it("creates a constituent and audits", async () => {
			createConstituentWithDuplicateGate.mockResolvedValueOnce({
				ok: true,
				constituent: constituentRow,
			});
			const res = await tool("search_constituents").handler(
				ctx([PERMISSIONS.CONSTITUENTS.MANAGE]),
				{ create: true, firstName: "Jane", lastName: "Doe" },
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { created: boolean }).created).toBe(true);
		});
	});

	describe("add_relationship", () => {
		it("blocks without constituents.manage", async () => {
			const res = await tool("add_relationship").handler(ctx([]), {
				fromId: "c-1",
				toId: "c-2",
				type: "household",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createRelationship).not.toHaveBeenCalled();
		});

		it("surfaces a domain error (e.g. self-link) without audit", async () => {
			createRelationship.mockResolvedValueOnce({
				ok: false,
				status: 400,
				error: "Self-relationship is not allowed",
			});
			const res = await tool("add_relationship").handler(
				ctx([PERMISSIONS.CONSTITUENTS.MANAGE]),
				{ fromId: "c-1", toId: "c-1", type: "household" },
			);
			expect(errorOf(res)).toMatch(/self-relationship/i);
			expect(logAuditEvent).not.toHaveBeenCalled();
		});

		it("creates a relationship and audits", async () => {
			createRelationship.mockResolvedValueOnce({
				ok: true,
				relationship: { $id: "r-1", fromId: "c-1", toId: "c-2" },
			});
			const res = await tool("add_relationship").handler(
				ctx([PERMISSIONS.CONSTITUENTS.MANAGE]),
				{ fromId: "c-1", toId: "c-2", type: "household" },
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { created: boolean }).created).toBe(true);
		});
	});

	describe("log_gift", () => {
		it("blocks listing without gifts.view", async () => {
			const res = await tool("log_gift").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listGifts).not.toHaveBeenCalled();
		});

		it("blocks logging without gifts.create", async () => {
			const res = await tool("log_gift").handler(ctx([]), {
				action: "log",
				constituentId: "c-1",
				amount: 100,
				giftDate: "2026-01-01",
				method: "card",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createDraftGift).not.toHaveBeenCalled();
		});

		it("lists gifts filtered by constituentId client-side", async () => {
			listGifts.mockResolvedValueOnce({
				items: [
					{ $id: "g-1", constituentId: "c-1" },
					{ $id: "g-2", constituentId: "c-2" },
				],
				total: 2,
			});
			const res = await tool("log_gift").handler(
				ctx([PERMISSIONS.GIFTS.VIEW]),
				{ constituentId: "c-1" },
			);
			expect((res.result as { count: number }).count).toBe(1);
		});

		it("logs a gift (draft then post) and audits", async () => {
			createDraftGift.mockResolvedValueOnce({ $id: "g-1" });
			postGift.mockResolvedValueOnce({
				$id: "g-1",
				amount: 100,
				currency: "USD",
				status: "posted",
				receiptNumber: 1,
			});
			const res = await tool("log_gift").handler(
				ctx([PERMISSIONS.GIFTS.CREATE]),
				{
					action: "log",
					constituentId: "c-1",
					amount: 100,
					giftDate: "2026-01-01",
					method: "card",
				},
			);
			expect(postGift).toHaveBeenCalledWith("g-1", "org-1");
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { logged: boolean }).logged).toBe(true);
		});
	});

	describe("share_donation_page", () => {
		it("blocks sharing without donations.config.view", async () => {
			const res = await tool("share_donation_page").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
		});

		it("returns a preview url when nothing is published", async () => {
			getOrganization.mockResolvedValueOnce({ name: "Acme Org", settings: {} });
			getPublished.mockResolvedValueOnce(null);
			createPreviewToken.mockReturnValueOnce("token-1");
			const res = await tool("share_donation_page").handler(
				ctx([PERMISSIONS.DONATIONS.CONFIG_VIEW]),
				{},
			);
			expect((res.result as { published: boolean }).published).toBe(false);
			expect((res.result as { previewUrl: string }).previewUrl).toContain(
				"token-1",
			);
		});

		it("blocks updating without donations.config.edit", async () => {
			const res = await tool("share_donation_page").handler(ctx([]), {
				action: "update",
				amounts: [25, 50],
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateDraft).not.toHaveBeenCalled();
		});

		it("updates the draft and audits", async () => {
			getOrCreateDraft.mockResolvedValueOnce({
				orgId: "org-1",
				payload: { amountsCents: [1000], designations: ["General"] },
				version: 1,
			});
			const res = await tool("share_donation_page").handler(
				ctx([PERMISSIONS.DONATIONS.CONFIG_EDIT]),
				{ action: "update", amounts: [25, 50] },
			);
			expect(updateDraft).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					expectedVersion: 1,
					payload: expect.objectContaining({ amountsCents: [2500, 5000] }),
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { updated: boolean }).updated).toBe(true);
		});

		it("publishes and audits", async () => {
			const res = await tool("share_donation_page").handler(
				ctx([PERMISSIONS.DONATIONS.CONFIG_EDIT]),
				{ action: "publish" },
			);
			expect(publish).toHaveBeenCalled();
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { published: boolean }).published).toBe(true);
		});
	});

	describe("assign_volunteer", () => {
		it("blocks listing without volunteers.view", async () => {
			const res = await tool("assign_volunteer").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listVolunteerShiftsForOrg).not.toHaveBeenCalled();
		});

		it("blocks assigning without volunteers.manage", async () => {
			const res = await tool("assign_volunteer").handler(ctx([]), {
				action: "assign",
				eventId: "e-1",
				constituentId: "c-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(bookVolunteerOnShift).not.toHaveBeenCalled();
		});

		it("denies a constituent from another org when assigning", async () => {
			getVolunteerShiftById.mockResolvedValueOnce({
				$id: "e-1",
				title: "Food drive",
				shiftCapacity: 5,
			});
			getConstituentById.mockResolvedValueOnce({
				...constituentRow,
				orgId: "org-2",
			});
			const res = await tool("assign_volunteer").handler(
				ctx([PERMISSIONS.VOLUNTEERS.MANAGE]),
				{ action: "assign", eventId: "e-1", constituentId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no constituent found/i);
			expect(bookVolunteerOnShift).not.toHaveBeenCalled();
		});

		it("assigns using the shift's real capacity, and audits", async () => {
			getVolunteerShiftById.mockResolvedValueOnce({
				$id: "e-1",
				title: "Food drive",
				shiftCapacity: 5,
			});
			getConstituentById.mockResolvedValueOnce(constituentRow);
			bookVolunteerOnShift.mockResolvedValueOnce({
				$id: "b-1",
				status: "confirmed",
			});
			const res = await tool("assign_volunteer").handler(
				ctx([PERMISSIONS.VOLUNTEERS.MANAGE]),
				{ action: "assign", eventId: "e-1", constituentId: "c-1" },
			);
			expect(bookVolunteerOnShift).toHaveBeenCalledWith(
				expect.objectContaining({ shiftCapacity: 5 }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { assigned: boolean }).assigned).toBe(true);
		});
	});

	describe("compute_suggested_ask", () => {
		it("blocks without constituents.view", async () => {
			const res = await tool("compute_suggested_ask").handler(ctx([]), {
				constituentId: "c-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(getSegmentForConstituent).not.toHaveBeenCalled();
		});

		it("denies a constituent from another org", async () => {
			getConstituentById.mockResolvedValueOnce({
				...constituentRow,
				orgId: "org-2",
			});
			const res = await tool("compute_suggested_ask").handler(
				ctx([PERMISSIONS.CONSTITUENTS.VIEW]),
				{ constituentId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no constituent found/i);
		});

		it("refuses do-not-contact constituents", async () => {
			getConstituentById.mockResolvedValueOnce({
				...constituentRow,
				doNotContact: true,
			});
			const res = await tool("compute_suggested_ask").handler(
				ctx([PERMISSIONS.CONSTITUENTS.VIEW]),
				{ constituentId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/do-not-contact/i);
			expect(getSegmentForConstituent).not.toHaveBeenCalled();
		});

		it("errors when scores haven't been computed yet", async () => {
			getConstituentById.mockResolvedValueOnce(constituentRow);
			getSegmentForConstituent.mockResolvedValueOnce(null);
			const res = await tool("compute_suggested_ask").handler(
				ctx([PERMISSIONS.CONSTITUENTS.VIEW]),
				{ constituentId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/haven't been computed/i);
		});

		it("computes the ask from this constituent's gifts and explains the basis", async () => {
			getConstituentById.mockResolvedValueOnce(constituentRow);
			getSegmentForConstituent.mockResolvedValueOnce({
				upgradeReadinessScore: 50,
			});
			listGifts.mockResolvedValueOnce({
				items: [
					{
						constituentId: "c-1",
						giftDate: "2026-01-01",
						amount: 100,
						status: "posted",
					},
					{
						constituentId: "c-2",
						giftDate: "2026-01-01",
						amount: 999,
						status: "posted",
					},
				],
				total: 2,
			});
			getLatestWealthScreen.mockResolvedValueOnce({ capacityBand: 500 });
			const res = await tool("compute_suggested_ask").handler(
				ctx([PERMISSIONS.CONSTITUENTS.VIEW]),
				{ constituentId: "c-1" },
			);
			const result = res.result as {
				suggestedAsk: number;
				basis: { baseAmount: number; capacityBand: number };
			};
			expect(result.suggestedAsk).toBe(112.5);
			expect(result.basis.baseAmount).toBe(100);
			expect(result.basis.capacityBand).toBe(500);
		});
	});
});
