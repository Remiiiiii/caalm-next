import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
	KIND_LABELS,
	type RiskAvertedPdfPayload,
} from "@/lib/dashboard/risk-impact-events";
import { formatCountDelta } from "@/lib/dashboard/risk-impact-trends";

const MAX_PDF_EVENTS = 80;

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
		marginBottom: 10,
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
	meta: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 14,
		fontSize: 8,
		color: "#64748b",
	},
	disclaimer: {
		backgroundColor: "#f8fafc",
		borderWidth: 1,
		borderColor: "#cbd5e1",
		padding: 8,
		marginBottom: 14,
		fontSize: 8,
		color: "#475569",
	},
	sectionTitle: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: "#0f5384",
		marginBottom: 8,
		marginTop: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#cbd5e1",
		paddingBottom: 4,
	},
	kpiRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 10,
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
		fontSize: 13,
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
	colDate: { width: "16%" },
	colKind: { width: "12%" },
	colRecord: { width: "32%" },
	colSource: { width: "18%" },
	colDollars: { width: "12%" },
	colCounted: { width: "10%" },
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
});

function formatPdfDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function RiskAvertedPdfDocument({
	payload,
}: {
	payload: RiskAvertedPdfPayload;
}) {
	const events = payload.events.slice(0, MAX_PDF_EVENTS);
	const omitted = Math.max(0, payload.events.length - events.length);

	return (
		<Document
			title={`${payload.orgName} — Risk averted`}
			author="CAALM"
			subject="Board packet: contract and grant risk averted"
		>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.headerBar}>
					<Text style={styles.headerTitle}>Risk averted board packet</Text>
					<Text style={styles.headerSub}>
						{payload.orgName} · {payload.periodLabel} · Confidential
					</Text>
				</View>
				<View style={styles.meta}>
					<Text>Prepared {payload.generatedAt}</Text>
					<Text>Window: {payload.period.toUpperCase()}</Text>
				</View>
				<Text style={styles.disclaimer}>
					Dollars are event-based: each unique flag, closed gap, or on-time
					renewal counts once. The dashboard sparkline may include demo
					tracking dates for empty weeks; this packet uses live events only.
					Year-over-year copy is withheld when the prior window has no dollars.
				</Text>

				<Text style={styles.sectionTitle}>Executive recap</Text>
				<View style={styles.kpiRow}>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Risk averted</Text>
						<Text style={styles.kpiValue}>{payload.primaryFormatted}</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Year over year</Text>
						<Text style={styles.kpiValue}>{payload.yoyLabel}</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Counted events</Text>
						<Text style={styles.kpiValue}>
							{payload.countedEventCount} of {payload.eventCount}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Counted dollars</Text>
						<Text style={styles.kpiValue}>
							{payload.countedDollarsFormatted}
						</Text>
					</View>
				</View>
				<Text style={styles.body}>{payload.narrative}</Text>

				<Text style={styles.sectionTitle}>What built the number</Text>
				<View style={styles.kpiRow}>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Flags caught</Text>
						<Text style={styles.kpiValue}>
							{payload.counts.complianceFlagsCaught}
						</Text>
						<Text style={styles.muted}>
							{formatCountDelta(payload.countTrends.complianceFlagsCaught)}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Gaps closed</Text>
						<Text style={styles.kpiValue}>
							{payload.counts.auditGapsClosed}
						</Text>
						<Text style={styles.muted}>
							{formatCountDelta(payload.countTrends.auditGapsClosed)}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Licenses renewed on time</Text>
						<Text style={styles.kpiValue}>
							{payload.counts.licensesRenewedOnTime}
						</Text>
						<Text style={styles.muted}>
							{formatCountDelta(payload.countTrends.licensesRenewedOnTime)}
						</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Still-open exposure</Text>
				<View style={styles.kpiRow}>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>High risk</Text>
						<Text style={styles.kpiValue}>{payload.openRisk.highRisk}</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Expiring in 90 days</Text>
						<Text style={styles.kpiValue}>{payload.openRisk.expiring90}</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Expired still open</Text>
						<Text style={styles.kpiValue}>{payload.openRisk.expired}</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Inventory monitored</Text>
				<View style={styles.kpiRow}>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Contracts</Text>
						<Text style={styles.kpiValue}>
							{payload.monitoring.contractsMonitored}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Grants</Text>
						<Text style={styles.kpiValue}>
							{payload.monitoring.grantsMonitored}
						</Text>
					</View>
					<View style={styles.kpiBox}>
						<Text style={styles.kpiLabel}>Clauses flagged</Text>
						<Text style={styles.kpiValue}>
							{payload.monitoring.clausesFlagged}
						</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Live events</Text>
				{events.length === 0 ? (
					<Text style={styles.muted}>
						No live flags, gaps, or renewals in this window.
					</Text>
				) : (
					<>
						<View style={styles.tableHeader}>
							<Text style={styles.colDate}>Date</Text>
							<Text style={styles.colKind}>Kind</Text>
							<Text style={styles.colRecord}>Record</Text>
							<Text style={styles.colSource}>Source</Text>
							<Text style={styles.colDollars}>Dollars</Text>
							<Text style={styles.colCounted}>Counted</Text>
						</View>
						{events.map((event) => (
							<View key={event.id} style={styles.tableRow} wrap={false}>
								<Text style={styles.colDate}>{formatPdfDate(event.date)}</Text>
								<Text style={styles.colKind}>{KIND_LABELS[event.kind]}</Text>
								<Text style={styles.colRecord}>{event.recordName}</Text>
								<Text style={styles.colSource}>{event.source}</Text>
								<Text style={styles.colDollars}>{event.dollarsFormatted}</Text>
								<Text style={styles.colCounted}>
									{event.countedTowardTotal ? "Yes" : "No"}
								</Text>
							</View>
						))}
						{omitted > 0 ? (
							<Text style={styles.muted}>
								{omitted} additional event{omitted === 1 ? "" : "s"} omitted
								from this packet. Open Risk averted in CAALM for the full
								register.
							</Text>
						) : null}
					</>
				)}

				<Text style={[styles.muted, { marginTop: 12 }]}>
					Sources:{" "}
					{[
						payload.dataSources.contracts ? "contracts" : null,
						payload.dataSources.licenses ? "licenses" : null,
						payload.dataSources.auditLogs ? "audit logs" : null,
					]
						.filter(Boolean)
						.join(", ") || "none in this permission set"}
					.
				</Text>
				<View style={styles.footer} fixed>
					<Text>CAALM · Risk averted · {payload.orgName}</Text>
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
