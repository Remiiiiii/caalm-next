import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const computeRiskImpact = vi.fn();
const buildJournalExport = vi.fn();
const journalExportToCsv = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/dashboard/risk-impact.service", () => ({
	computeRiskImpact: (...args: unknown[]) => computeRiskImpact(...args),
}));
vi.mock("@/lib/funding/journal-export", () => ({
	buildJournalExport: (...args: unknown[]) => buildJournalExport(...args),
	journalExportToCsv: (...args: unknown[]) => journalExportToCsv(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { ANALYTICS_TOOLS } = await import("./analyticsTools");

function tool(name: string) {
	const found = ANALYTICS_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "user-1", email: "user@org.test", name: "Jamie" },
	} as unknown as Parameters<(typeof ANALYTICS_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("ANALYTICS_TOOLS (14.1-14.3)", () => {
	beforeEach(() => {
		computeRiskImpact.mockReset();
		buildJournalExport.mockReset();
		journalExportToCsv.mockReset().mockReturnValue("row_kind,amount\n");
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("query_risk_averted", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("query_risk_averted").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(computeRiskImpact).not.toHaveBeenCalled();
		});

		it("answers with the narrative and honest data-source flags", async () => {
			computeRiskImpact.mockResolvedValueOnce({
				period: "ytd",
				periodLabel: "2026 YTD",
				narrative: "You've averted $10,000 in risk this year.",
				trackingNote: "Contract monitoring is unavailable for your account.",
				primary: { label: "Contract & grant risk averted", amount: 10000 },
				secondary: { label: "Portfolio protected", amount: 50000 },
				counts: {
					complianceFlagsCaught: 2,
					auditGapsClosed: 1,
					licensesRenewedOnTime: 3,
				},
				openRisk: { highRisk: 1, expiring90: 2, expired: 0 },
				dataSources: { contracts: true, licenses: false, auditLogs: false },
			});
			const res = await tool("query_risk_averted").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ period: "ytd" },
			);
			expect(computeRiskImpact).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "user-1",
					orgId: "org-1",
					period: "ytd",
				}),
			);
			const result = res.result as {
				narrative: string;
				dataSources: { licenses: boolean };
			};
			expect(result.narrative).toMatch(/averted/i);
			expect(result.dataSources.licenses).toBe(false);
		});

		it("falls back to ytd for an invalid period", async () => {
			computeRiskImpact.mockResolvedValueOnce({
				period: "ytd",
				periodLabel: "2026 YTD",
				narrative: "x",
				trackingNote: "",
				primary: {},
				secondary: {},
				counts: {},
				openRisk: {},
				dataSources: { contracts: true, licenses: true, auditLogs: true },
			});
			await tool("query_risk_averted").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ period: "nonsense" },
			);
			expect(computeRiskImpact).toHaveBeenCalledWith(
				expect.objectContaining({ period: "ytd" }),
			);
		});
	});

	describe("export_table_csv", () => {
		it("blocks without funding.view", async () => {
			const res = await tool("export_table_csv").handler(ctx([]), {
				table: "funding_journal",
				startDate: "2026-01-01",
				endDate: "2026-01-31",
			});
			expect(errorOf(res)).toMatch(/permission/i);
			expect(buildJournalExport).not.toHaveBeenCalled();
		});

		it("refuses an unsupported table honestly (2a rule)", async () => {
			const res = await tool("export_table_csv").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{ table: "contracts", startDate: "2026-01-01", endDate: "2026-01-31" },
			);
			expect(errorOf(res)).toMatch(/isn't available/i);
			expect(buildJournalExport).not.toHaveBeenCalled();
		});

		it("exports the funding journal, returns CSV, and audits the export", async () => {
			buildJournalExport.mockResolvedValueOnce({
				rows: [{ rowKind: "gift" }],
				giftRowCount: 1,
				reclassReleaseCount: 0,
				giftCashTotal: 500,
				startDate: "2026-01-01",
				endDate: "2026-01-31",
			});
			const res = await tool("export_table_csv").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{
					table: "funding_journal",
					startDate: "2026-01-01",
					endDate: "2026-01-31",
				},
			);
			expect(buildJournalExport).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ action: "export", module: "regulatory" }),
			);
			const result = res.result as { csv: string; rowCount: number };
			expect(result.csv).toContain("row_kind");
			expect(result.rowCount).toBe(1);
		});

		it("redirects to the full export page instead of dumping huge CSVs into chat", async () => {
			const rows = Array.from({ length: 501 }, () => ({ rowKind: "gift" }));
			buildJournalExport.mockResolvedValueOnce({
				rows,
				giftRowCount: 501,
				reclassReleaseCount: 0,
				giftCashTotal: 1,
				startDate: "2026-01-01",
				endDate: "2026-12-31",
			});
			const res = await tool("export_table_csv").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{
					table: "funding_journal",
					startDate: "2026-01-01",
					endDate: "2026-12-31",
				},
			);
			expect(res.clientAction).toEqual(
				expect.objectContaining({ type: "navigate" }),
			);
			expect(journalExportToCsv).not.toHaveBeenCalled();
		});
	});

	describe("schedule_report", () => {
		it("blocks without settings.view", async () => {
			const res = await tool("schedule_report").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission/i);
		});

		it("returns an honest not-available stub (2a rule) with no fake audit", async () => {
			const res = await tool("schedule_report").handler(
				ctx([PERMISSIONS.SETTINGS.VIEW]),
				{},
			);
			expect((res.result as { available: boolean }).available).toBe(false);
			expect(logAuditEvent).not.toHaveBeenCalled();
		});
	});
});
