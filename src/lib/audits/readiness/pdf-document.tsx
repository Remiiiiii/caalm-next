import { Document, Text, View } from "@react-pdf/renderer";
import { isReadinessDomainScored } from "@/lib/audits/readiness/score";
import type { AuditReadinessSnapshotPayload } from "@/lib/audits/readiness/types";
import { READINESS_DISCLAIMER } from "@/lib/audits/readiness/types";
import {
	AMBER,
	BarRow,
	BLUE,
	GREEN,
	Heading,
	MarkdownText,
	MUTED,
	PacketHeader,
	PacketPage,
	PacketTable,
	packet,
	RUST,
	SANS_BOLD,
	StatBand,
	TEAL,
} from "@/lib/pdf/packet";

const TITLE = "Audit readiness packet";
const RAG_COLOR: Record<string, string> = {
	green: GREEN,
	amber: AMBER,
	red: RUST,
};

function HistoryBars({
	points,
}: {
	points: Array<{ label: string; value: number }>;
}) {
	if (!points.length) {
		return <Text style={packet.small}>No score history yet.</Text>;
	}
	const max = Math.max(...points.map((p) => p.value), 1);
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "flex-end",
				height: 80,
				gap: 6,
			}}
		>
			{points.map((point) => (
				<View key={point.label} style={{ flex: 1, alignItems: "center" }}>
					<Text style={{ fontSize: 7, marginBottom: 2 }}>
						{point.value}%
					</Text>
					<View
						style={{
							width: "100%",
							height: Math.max(4, (point.value / max) * 56),
							backgroundColor: TEAL,
						}}
					/>
					<Text style={{ fontSize: 6.5, marginTop: 3, color: MUTED }}>
						{point.label}
					</Text>
				</View>
			))}
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
	const hasSources = payload.sourcesUsed.length > 0;
	const severity = [
		{ label: "Critical", value: summary.severity.critical, color: RUST },
		{ label: "Moderate", value: summary.severity.moderate, color: AMBER },
		{ label: "Low", value: summary.severity.low, color: MUTED },
	];
	const severityMax = Math.max(...severity.map((s) => s.value), 1);

	return (
		<Document
			title={`CAALM Readiness — ${orgName}`}
			author="CAALM Solutions"
			subject="Customer-facing audit readiness packet"
		>
			<PacketPage org={orgName} title={TITLE}>
				<PacketHeader
					eyebrow={`${orgName} · Confidential`}
					title="Audit readiness packet"
					left={`Cadence: ${cadence}`}
					right={`Generated ${generatedAt}`}
				/>

				<Text style={packet.callout}>{READINESS_DISCLAIMER}</Text>

				<StatBand
					stats={[
						{
							label: "Readiness score",
							value: hasSources
								? `${summary.readinessScore}%`
								: "N/A",
						},
						{
							label: "RAG status",
							value: hasSources ? summary.ragStatus.toUpperCase() : "—",
							color: hasSources ? RAG_COLOR[summary.ragStatus] : undefined,
						},
						{
							label: "Sources used",
							value: payload.sourcesUsed.join(", ") || "None",
						},
						{
							label: "Score delta",
							value:
								payload.scoreDelta === null
									? "—"
									: `${payload.scoreDelta >= 0 ? "+" : ""}${payload.scoreDelta}%`,
						},
					]}
				/>

				<Heading>Executive summary</Heading>
				<MarkdownText
					text={
						aiSummary ||
						"Auto-summary unavailable. Review KPIs, severity, and evidence gaps below."
					}
				/>

				<View wrap={false}>
					<Heading>Charts</Heading>
					<View style={packet.card} wrap={false}>
						<Text style={packet.cardTitle}>Domain readiness (%)</Text>
						{summary.domains.map((d) => {
							const scored = isReadinessDomainScored(d, payload.sourcesUsed);
							return (
								<BarRow
									key={d.label}
									label={d.label}
									value={scored ? `${d.readinessPercent}%` : "Not scored"}
									pct={scored ? d.readinessPercent : 0}
								/>
							);
						})}
					</View>
					<View style={packet.card} wrap={false}>
						<Text style={packet.cardTitle}>Severity breakdown (counts)</Text>
						{severity.map((s) => (
							<BarRow
								key={s.label}
								label={s.label}
								value={String(s.value)}
								pct={(s.value / severityMax) * 100}
								color={s.color}
							/>
						))}
					</View>
					<View style={packet.card} wrap={false}>
						<Text style={packet.cardTitle}>Score history</Text>
						<HistoryBars points={summary.trends.compliance} />
					</View>
				</View>

				<Heading>Priority insights</Heading>
				{summary.insights.length === 0 ? (
					<Text style={packet.small}>No priority insights this period.</Text>
				) : (
					summary.insights.map((insight) => (
						<View
							key={insight.id}
							style={[packet.tableRow, { flexDirection: "column" }]}
							wrap={false}
						>
							<Text style={{ fontFamily: SANS_BOLD, fontSize: 9 }}>
								<Text style={{ color: RAG_COLOR[insight.severity] ?? RUST }}>
									{insight.severity.toUpperCase()}
								</Text>
								{"  "}
								{insight.title}
							</Text>
							<Text style={packet.small}>{insight.description}</Text>
							<Text style={[packet.small, { color: BLUE }]}>
								Open in CAALM: {insight.moduleLabel} ({insight.moduleLink})
							</Text>
						</View>
					))
				)}

				<Heading>Evidence map (CFCE segment)</Heading>
				<Text style={[packet.small, { marginBottom: 6 }]}>
					Aligned to HRSA OSV, child-welfare monitoring, and financial PBC
					(contracts/grants slice). Rows support prep; they are not pass/fail
					determinations.
				</Text>
				<PacketTable
					columns={[
						{ header: "Requirement", width: "22%" },
						{ header: "Label", width: "34%" },
						{ header: "Status", width: "14%" },
						{ header: "Covering record", width: "30%" },
					]}
					rows={payload.evidenceMapHits.map((r) => [
						r.requirementId,
						r.label,
						r.status === "gap" ? "Gap" : "Covered",
						r.matchedRecords?.[0]?.title ?? "—",
					])}
				/>

				<Heading>Public site (informational)</Heading>
				{payload.siteCrawl ? (
					<View wrap={false}>
						<Text style={packet.body}>URL: {payload.siteCrawl.websiteUrl}</Text>
						<Text style={packet.body}>
							Health hint: {payload.siteCrawl.healthHint} · Pages crawled:{" "}
							{payload.siteCrawl.pages.length} · robots.txt:{" "}
							{payload.siteCrawl.robotsTxtFound ? "yes" : "no"} · sitemap:{" "}
							{payload.siteCrawl.sitemapFound ? "yes" : "no"}
						</Text>
						{payload.siteCrawl.issues.slice(0, 8).map((issue) => (
							<Text key={issue} style={packet.small}>
								• {issue}
							</Text>
						))}
						<Text style={[packet.small, { marginTop: 6 }]}>
							Public site findings are informational and are not included in the
							readiness score.
						</Text>
					</View>
				) : (
					<Text style={packet.small}>
						No website URL configured for this organization.
					</Text>
				)}

				<Heading>KPI detail</Heading>
				<PacketTable
					columns={[
						{ header: "Contracts", width: "25%", align: "right" },
						{ header: "Licenses at risk", width: "25%", align: "right" },
						{ header: "Expiring soon", width: "25%", align: "right" },
						{ header: "Evidence gaps", width: "25%", align: "right" },
					]}
					rows={[
						[
							String(summary.kpis.totalContracts),
							String(summary.kpis.licensesAtRisk),
							String(summary.kpis.expiringSoon),
							String(summary.kpis.evidenceGaps),
						],
					]}
				/>
			</PacketPage>
		</Document>
	);
}
