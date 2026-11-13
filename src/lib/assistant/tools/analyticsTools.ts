import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { computeRiskImpact } from "@/lib/dashboard/risk-impact.service";
import type { RiskImpactPeriod } from "@/lib/dashboard/risk-impact.types";
import {
	buildJournalExport,
	journalExportToCsv,
} from "@/lib/funding/journal-export";
import { logAuditEvent } from "@/lib/services/audit-logger";

const RISK_IMPACT_PERIODS: RiskImpactPeriod[] = [
	"ytd",
	"month",
	"quarter",
	"last30",
	"last90",
];

function actorName(ctx: {
	user: { fullName?: string; name?: string | null; email?: string | null };
}): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

/** Chat responses stay readable; point to the full export page past this. */
const MAX_CSV_ROWS_IN_CHAT = 500;

export const ANALYTICS_TOOLS: ToolDefinition[] = [
	{
		name: "query_risk_averted",
		description:
			"Answer a dashboard metric question about risk averted, compliance flags, audit gaps, or open risk, in plain English. Read-only.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				period: {
					type: "string",
					enum: RISK_IMPACT_PERIODS,
					description: "Reporting window. Defaults to ytd.",
				},
				division: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return { result: { error: "Missing contracts.view permission" } };
			}
			const period = RISK_IMPACT_PERIODS.includes(
				args.period as RiskImpactPeriod,
			)
				? (args.period as RiskImpactPeriod)
				: "ytd";
			const division = args.division ? String(args.division) : undefined;

			const snapshot = await computeRiskImpact({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				period,
				division,
			});

			return {
				result: {
					period: snapshot.period,
					periodLabel: snapshot.periodLabel,
					narrative: snapshot.narrative,
					trackingNote: snapshot.trackingNote,
					riskAverted: snapshot.primary,
					portfolioProtected: snapshot.secondary,
					counts: snapshot.counts,
					openRisk: snapshot.openRisk,
					// Honest dashboards: say which sources actually fed this answer.
					dataSources: snapshot.dataSources,
				},
			};
		},
	},
	{
		name: "export_table_csv",
		description:
			"Export a table to CSV. Currently supports the nonprofit funding journal export (gifts and fund reclassifications) for a date range. Mutating: confirms and audits a sensitive export.",
		requiredPermissions: [PERMISSIONS.FUNDING.VIEW],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				table: {
					type: "string",
					enum: ["funding_journal"],
					description:
						"Which table to export. Only funding_journal exists today.",
				},
				startDate: { type: "string", description: "YYYY-MM-DD" },
				endDate: { type: "string", description: "YYYY-MM-DD" },
			},
			required: ["table", "startDate", "endDate"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.FUNDING.VIEW])) {
				return { result: { error: "Missing funding.view permission" } };
			}
			const table = String(args.table ?? "");
			if (table !== "funding_journal") {
				return {
					result: {
						error:
							"CSV export isn't available for that table yet — only the funding journal export (gifts and fund reclassifications) is supported today.",
					},
				};
			}
			const startDate = String(args.startDate ?? "").trim();
			const endDate = String(args.endDate ?? "").trim();
			if (!startDate || !endDate) {
				return { result: { error: "Give both startDate and endDate." } };
			}

			const exportResult = await buildJournalExport({
				orgId: ctx.orgId,
				startDate,
				endDate,
			});

			await logAuditEvent({
				event_id: `assistant_journal_export_${ctx.orgId}_${startDate}_${endDate}_${Date.now()}`,
				event_title: "Assistant exported finance journal",
				action: "export",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "regulatory",
				target_type: "journal_export",
				target_id: `${startDate}_${endDate}`,
				target_label: "Journal export",
				summary: `CAALM assistant exported ${exportResult.rows.length} journal rows for ${startDate} through ${endDate}`,
				metadata: { source: "ai_assistant", startDate, endDate },
			}).catch(() => undefined);

			if (exportResult.rows.length > MAX_CSV_ROWS_IN_CHAT) {
				return {
					clientAction: {
						type: "navigate",
						href: "/contracts/funding-retention",
					},
					result: {
						rowCount: exportResult.rows.length,
						giftRowCount: exportResult.giftRowCount,
						giftCashTotal: exportResult.giftCashTotal,
						message:
							"That range has too many rows to show here — opening the funding page so you can download the full CSV.",
					},
				};
			}

			return {
				result: {
					rowCount: exportResult.rows.length,
					giftRowCount: exportResult.giftRowCount,
					giftCashTotal: exportResult.giftCashTotal,
					csv: journalExportToCsv(exportResult),
				},
			};
		},
	},
	{
		name: "schedule_report",
		description:
			"Schedule a recurring report. Not available yet — the product has one-shot report generation only, no recurrence.",
		requiredPermissions: [PERMISSIONS.SETTINGS.VIEW],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				department: { type: "string" },
				frequency: {
					type: "string",
					enum: ["daily", "weekly", "monthly"],
				},
			},
		},
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.SETTINGS.VIEW])) {
				return { result: { error: "Missing settings.view permission" } };
			}
			return {
				result: {
					available: false,
					message:
						"Recurring report scheduling isn't available yet — I can generate a one-time report now if that helps (ask me to generate a report).",
				},
			};
		},
	},
];
