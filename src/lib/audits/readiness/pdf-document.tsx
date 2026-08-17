import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type { AuditReadinessSnapshotPayload } from "@/lib/audits/readiness/types";
import { READINESS_DISCLAIMER } from "@/lib/audits/readiness/types";

const styles = StyleSheet.create({
	page: {
		paddingTop: 48,
		paddingBottom: 56,
		paddingHorizontal: 48,
		fontSize: 10,
		fontFamily: "Helvetica",
		color: "#334155",
		lineHeight: 1.45,
	},
	headerBar: {
		backgroundColor: "#0f5384",
		paddingVertical: 14,
		paddingHorizontal: 16,
		marginBottom: 18,
	},
	headerTitle: {
		color: "#ffffff",
		fontSize: 16,
		fontFamily: "Helvetica-Bold",
	},
	headerSub: {
		color: "#dbeafe",
		fontSize: 9,
		marginTop: 4,
	},
	disclaimer: {
		backgroundColor: "#fff7ed",
		borderWidth: 1,
		borderColor: "#fdba74",
		padding: 10,
		marginBottom: 16,
		fontSize: 8,
		color: "#9a3412",
	},
	sectionTitle: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: "#0f5384",
		marginBottom: 8,
		marginTop: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#cbd5e1",
		paddingBottom: 4,
	},
	kpiRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
	},
	kpiBox: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		backgroundColor: "#f8fafc",
		padding: 8,
	},
	kpiLabel: {
		fontSize: 8,
		color: "#64748b",
		marginBottom: 4,
	},
	kpiValue: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		color: "#1e293b",
	},
	body: {
		fontSize: 9,
		marginBottom: 6,
	},
	muted: {
		fontSize: 8,
		color: "#64748b",
	},
	chartFrame: {
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 10,
		marginBottom: 12,
		backgroundColor: "#ffffff",
	},
	barRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	barLabel: {
		width: 90,
		fontSize: 8,
	},
	barTrack: {
		flex: 1,
		height: 10,
		backgroundColor: "#e2e8f0",
		marginRight: 8,
	},
	barFill: {
		height: 10,
		backgroundColor: "#0f5384",
	},
	barValue: {
		width: 28,
		fontSize: 8,
		textAlign: "right",
	},
	footer: {
		position: "absolute",
		bottom: 28,
		left: 48,
		right: 48,
		fontSize: 7,
		color: "#94a3b8",
		borderTopWidth: 1,
		borderTopColor: "#e2e8f0",
		paddingTop: 6,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	insightRow: {
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		paddingVertical: 6,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#eff6ff",
		paddingVertical: 5,
		paddingHorizontal: 4,
		fontFamily: "Helvetica-Bold",
		fontSize: 8,
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 5,
		paddingHorizontal: 4,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		fontSize: 8,
	},
	colReq: { width: "28%" },
	colLabel: { width: "44%" },
	colType: { width: "16%" },
	colMod: { width: "12%" },
});

function DomainBarChart({
	domains,
}: {
	domains: Array<{ label: string; readinessPercent: number }>;
}) {
	return (
		<View style={styles.chartFrame}>
			<Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
				Domain readiness (%)
			</Text>
			{domains.map((domain) => (
				<View key={domain.label} style={styles.barRow} wrap={false}>
					<Text style={styles.barLabel}>{domain.label}</Text>
					<View style={styles.barTrack}>
						<View
							style={[
								styles.barFill,
								{ width: `${Math.max(0, Math.min(100, domain.readinessPercent))}%` },
							]}
						/>
					</View>
					<Text style={styles.barValue}>{domain.readinessPercent}%</Text>
				</View>
			))}
		</View>
	);
}

function SeverityBars({
	severity,
}: {
	severity: { critical: number; moderate: number; low: number };
}) {
	const max = Math.max(severity.critical, severity.moderate, severity.low, 1);
	const rows = [
		{ label: "Critical", value: severity.critical, color: "#dc2626" },
		{ label: "Moderate", value: severity.moderate, color: "#d97706" },
		{ label: "Low", value: severity.low, color: "#64748b" },
	];
	return (
		<View style={styles.chartFrame}>
			<Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
				Severity breakdown (counts)
			</Text>
			{rows.map((row) => (
				<View key={row.label} style={styles.barRow} wrap={false}>
					<Text style={styles.barLabel}>{row.label}</Text>
					<View style={styles.barTrack}>
						<View
							style={{
								height: 10,
								width: `${Math.round((row.value / max) * 100)}%`,
								backgroundColor: row.color,
							}}
						/>
					</View>
					<Text style={styles.barValue}>{row.value}</Text>
				</View>
			))}
		</View>
	);
}

function HistoryLine({
	points,
}: {
	points: Array<{ label: string; value: number }>;
}) {
	if (!points.length) {
		return (
			<View style={styles.chartFrame}>
				<Text style={styles.muted}>No score history yet.</Text>
			</View>
		);
	}
	const max = Math.max(...points.map((p) => p.value), 1);
	return (
		<View style={styles.chartFrame}>
			<Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
				Score history
			</Text>
			<View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 }}>
				{points.map((point) => (
					<View key={point.label} style={{ flex: 1, alignItems: "center" }}>
						<Text style={{ fontSize: 7, marginBottom: 2 }}>{point.value}</Text>
						<View
							style={{
								width: "100%",
								height: Math.max(4, (point.value / max) * 60),
								backgroundColor: "#03AFBF",
							}}
						/>
						<Text style={{ fontSize: 6, marginTop: 3, color: "#64748b" }}>
							{point.label}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

export function AuditReadinessPdfDocument({
	orgName,
	cadence,
	generatedAt,
	payload,
	aiSummary,
}: {
	orgName: string;
	cadence: string;
	generatedAt: string;
	payload: AuditReadinessSnapshotPayload;
	aiSummary?: string;
}) {
	const summary = payload.summary;
	const scoreLabel =
		payload.sourcesUsed.length === 0
			? "N/A"
			: `${summary.readinessScore}`;

	return (
		<Document
			title={`CAALM Readiness — ${orgName}`}
			author="CAALM Solutions"
			subject="Customer-facing audit readiness packet"
		>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.headerBar}>
					<Text style={styles.headerTitle}>CAALM Audit Readiness Packet</Text>
					<Text style={styles.headerSub}>
						{orgName} · {cadence.toUpperCase()} · Generated {generatedAt}
					</Text>
				</View>

				<Text style={styles.disclaimer}>{READINESS_DISCLAIMER}</Text>

				<View style={styles.kpiRow}>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Readiness score</Text>
						<Text style={styles.kpiValue}>{scoreLabel}</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>RAG status</Text>
						<Text style={styles.kpiValue}>
							{payload.sourcesUsed.length ? summary.ragStatus : "—"}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Sources used</Text>
						<Text style={styles.kpiValue}>
							{payload.sourcesUsed.join(", ") || "None"}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Score delta</Text>
						<Text style={styles.kpiValue}>
							{payload.scoreDelta === null
								? "—"
								: `${payload.scoreDelta >= 0 ? "+" : ""}${payload.scoreDelta}`}
						</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>1. Executive summary</Text>
				<Text style={styles.body}>
					{aiSummary ||
						"Auto-summary unavailable. Review KPIs, severity, and evidence gaps below."}
				</Text>

				<Text style={styles.sectionTitle}>2. Charts</Text>
				<DomainBarChart domains={summary.domains} />
				<SeverityBars severity={summary.severity} />
				<HistoryLine points={summary.trends.compliance} />

				<Text style={styles.sectionTitle}>3. Priority insights</Text>
				{summary.insights.map((insight) => (
					<View key={insight.id} style={styles.insightRow} wrap={false}>
						<Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
							[{insight.severity}] {insight.title}
						</Text>
						<Text style={styles.muted}>{insight.description}</Text>
						<Text style={styles.muted}>
							Open in CAALM: {insight.moduleLabel} ({insight.moduleLink})
						</Text>
					</View>
				))}

				<View style={styles.footer} fixed>
					<Text>CAALM Solutions · Confidential · Internal org use</Text>
					<Text
						render={({ pageNumber, totalPages }) =>
							`Page ${pageNumber} of ${totalPages}`
						}
					/>
				</View>
			</Page>

			<Page size="LETTER" style={styles.page}>
				<Text style={styles.sectionTitle}>4. Evidence map (CFCE segment)</Text>
				<Text style={styles.muted}>
					Aligned to HRSA OSV, child-welfare monitoring, and financial PBC
					(contracts/grants slice). Rows support prep; they are not pass/fail
					determinations.
				</Text>
				<View style={styles.tableHeader}>
					<Text style={styles.colReq}>Requirement</Text>
					<Text style={styles.colLabel}>Label</Text>
					<Text style={styles.colType}>Audit type</Text>
					<Text style={styles.colMod}>Module</Text>
				</View>
				{payload.evidenceMapHits.map((row) => (
					<View key={row.requirementId} style={styles.tableRow} wrap={false}>
						<Text style={styles.colReq}>{row.requirementId}</Text>
						<Text style={styles.colLabel}>{row.label}</Text>
						<Text style={styles.colType}>{row.auditType}</Text>
						<Text style={styles.colMod}>{row.caalmModule}</Text>
					</View>
				))}

				<Text style={styles.sectionTitle}>5. Public site (informational)</Text>
				{payload.siteCrawl ? (
					<View>
						<Text style={styles.body}>
							URL: {payload.siteCrawl.websiteUrl}
						</Text>
						<Text style={styles.body}>
							Health hint: {payload.siteCrawl.healthHint} · Pages crawled:{" "}
							{payload.siteCrawl.pages.length} · robots.txt:{" "}
							{payload.siteCrawl.robotsTxtFound ? "yes" : "no"} · sitemap:{" "}
							{payload.siteCrawl.sitemapFound ? "yes" : "no"}
						</Text>
						{payload.siteCrawl.issues.slice(0, 8).map((issue) => (
							<Text key={issue} style={styles.muted}>
								• {issue}
							</Text>
						))}
						<Text style={{ ...styles.muted, marginTop: 6 }}>
							Public site findings are informational and are not included in the
							readiness score.
						</Text>
					</View>
				) : (
					<Text style={styles.muted}>
						No website URL configured for this organization.
					</Text>
				)}

				<Text style={styles.sectionTitle}>6. KPI detail</Text>
				<Text style={styles.body}>
					Contracts: {summary.kpis.totalContracts} · Licenses at risk:{" "}
					{summary.kpis.licensesAtRisk} · Expiring soon:{" "}
					{summary.kpis.expiringSoon} · Evidence gaps:{" "}
					{summary.kpis.evidenceGaps}
				</Text>

				<View style={styles.footer} fixed>
					<Text>{READINESS_DISCLAIMER}</Text>
					<Text
						render={({ pageNumber, totalPages }) =>
							`Page ${pageNumber} of ${totalPages}`
						}
					/>
				</View>
			</Page>
		</Document>
	);
}
