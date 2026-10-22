import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { RiskImpactEventKind } from "@/lib/dashboard/risk-impact.types";
import {
	formatRiskUsdExact,
	KIND_LABELS,
	type RiskAvertedPdfPayload,
	sumCountedEventDollars,
} from "@/lib/dashboard/risk-impact-events";
import {
	BLUE,
	GREEN,
	HAIRLINE,
	INK,
	MUTED,
	PacketFooter,
	RUST,
	SANS,
	SANS_BOLD,
	SERIF_BOLD,
	TEAL,
} from "@/lib/pdf/packet";

const MAX_PDF_EVENTS = 80;

const styles = StyleSheet.create({
	page: {
		paddingTop: 44,
		paddingBottom: 60,
		paddingHorizontal: 52,
		fontSize: 9.5,
		fontFamily: SANS,
		color: INK,
		lineHeight: 1.45,
	},
	eyebrow: {
		fontSize: 8,
		fontFamily: SANS_BOLD,
		color: MUTED,
		textTransform: "uppercase",
		letterSpacing: 1.2,
	},
	h1: {
		fontSize: 24,
		fontFamily: SERIF_BOLD,
		color: BLUE,
		marginTop: 4,
		marginBottom: 12,
	},
	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 0,
		paddingBottom: 8,
		borderBottomWidth: 2,
		borderBottomColor: BLUE,
		fontSize: 8.5,
		color: MUTED,
	},
	hero: {
		flexDirection: "row",
		marginTop: 16,
		backgroundColor: "#eef7fb",
		borderLeftWidth: 4,
		borderLeftColor: TEAL,
		padding: 16,
		gap: 20,
	},
	heroMain: { flex: 1.7 },
	heroLabel: {
		fontSize: 8,
		fontFamily: SANS_BOLD,
		color: MUTED,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	heroValue: {
		fontSize: 40,
		fontFamily: SERIF_BOLD,
		color: BLUE,
		marginTop: 2,
		lineHeight: 1.1,
	},
	heroNarrative: { marginTop: 8, fontSize: 10 },
	heroStats: {
		flex: 1,
		borderLeftWidth: 1,
		borderLeftColor: HAIRLINE,
		paddingLeft: 16,
	},
	statBlock: { paddingVertical: 8 },
	statDivided: {
		borderTopWidth: 1,
		borderTopColor: HAIRLINE,
	},
	statLabel: { fontSize: 8, color: MUTED },
	statValue: { fontSize: 13, fontFamily: SERIF_BOLD, color: INK },
	h2: {
		fontSize: 13,
		fontFamily: SERIF_BOLD,
		color: BLUE,
		marginTop: 18,
		marginBottom: 4,
	},
	body: { fontSize: 9.5, color: INK, marginBottom: 8 },
	small: { fontSize: 8, color: MUTED },
	tableHeader: {
		flexDirection: "row",
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: INK,
		fontFamily: SANS_BOLD,
		fontSize: 8,
		color: MUTED,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: HAIRLINE,
		fontSize: 8.5,
	},
	tableTotal: {
		flexDirection: "row",
		paddingVertical: 6,
		fontSize: 8.5,
		fontFamily: SANS_BOLD,
	},
	notCounted: { color: "#9aa2af" },
	right: { textAlign: "right" },
	twoCol: { flexDirection: "row", gap: 28 },
	col: { flex: 1 },
	figureRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		paddingVertical: 5,
		borderTopWidth: 1,
		borderTopColor: HAIRLINE,
	},
	figure: { fontSize: 14, fontFamily: SERIF_BOLD },
	defGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	def: { width: "48%", marginBottom: 4 },
	defTerm: { fontFamily: SANS_BOLD, fontSize: 8.5, color: BLUE },
	// Builds-the-number table
	bType: { width: "34%" },
	bRecorded: { width: "16%" },
	bCounted: { width: "16%" },
	bTrend: { width: "16%", paddingLeft: 8 },
	bDollars: { width: "18%" },
	// Register table
	colDate: { width: "13%" },
	colKind: { width: "10%" },
	colRecord: { width: "34%", paddingRight: 6 },
	colSource: { width: "17%" },
	colDollars: { width: "15%" },
	colCounted: { width: "11%" },
});

const DEFINITIONS: Array<[string, string]> = [
	[
		"Risk averted",
		"Estimated dollars protected by catching a problem before it became a loss, summed over counted events.",
	],
	[
		"Counted event",
		"A unique compliance flag, closed audit gap or on-time renewal. Each counts once.",
	],
	[
		"Duplicate",
		"A logged event that repeats one already counted. Listed for the record, adds no dollars.",
	],
	[
		"Still-open exposure",
		"Unresolved items kept apart from the headline so outstanding work is never counted as averted.",
	],
];

function formatPdfDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// Helvetica has no arrow glyphs, so spell the direction out.
function trendText(trend: {
	direction: string;
	prior?: number | null;
}): string {
	const prior = trend.prior ?? 0;
	if (trend.direction === "flat") return "No change";
	return `${trend.direction === "down" ? "Down" : "Up"} from ${prior}`;
}

function Figure({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color?: string;
}) {
	return (
		<View style={styles.figureRow}>
			<Text>{label}</Text>
			<Text style={[styles.figure, color ? { color } : {}]}>{value}</Text>
		</View>
	);
}

export function RiskAvertedPdfDocument({
	payload,
}: {
	payload: RiskAvertedPdfPayload;
}) {
	const events = payload.events.slice(0, MAX_PDF_EVENTS);
	const omitted = Math.max(0, payload.events.length - events.length);
	const duplicates = payload.eventCount - payload.countedEventCount;
	const yoy = payload.yoyLabel.replace(/^=\s*/, "");
	const sources =
		[
			payload.dataSources.contracts ? "contracts" : null,
			payload.dataSources.licenses ? "licenses" : null,
			payload.dataSources.auditLogs ? "audit logs" : null,
		]
			.filter(Boolean)
			.join(", ") || "none in this permission set";

	const drivers: Array<{
		kind: RiskImpactEventKind;
		label: string;
		count: number;
		trend: RiskAvertedPdfPayload["countTrends"]["complianceFlagsCaught"];
	}> = [
		{
			kind: "flag",
			label: "Compliance flags caught",
			count: payload.counts.complianceFlagsCaught,
			trend: payload.countTrends.complianceFlagsCaught,
		},
		{
			kind: "gap",
			label: "Audit gaps closed",
			count: payload.counts.auditGapsClosed,
			trend: payload.countTrends.auditGapsClosed,
		},
		{
			kind: "renewal",
			label: "Licenses renewed on time",
			count: payload.counts.licensesRenewedOnTime,
			trend: payload.countTrends.licensesRenewedOnTime,
		},
	];
	const countedByKind = (kind: RiskImpactEventKind) =>
		payload.events.filter((e) => e.kind === kind && e.countedTowardTotal)
			.length;
	const openTotal =
		payload.openRisk.highRisk +
		payload.openRisk.expiring90 +
		payload.openRisk.expired;

	return (
		<Document
			title={`${payload.orgName} — Risk averted`}
			author="CAALM"
			subject="Board packet: contract and grant risk averted"
		>
			<Page size="LETTER" style={styles.page}>
				<Text style={styles.eyebrow}>{payload.orgName} · Confidential</Text>
				<Text style={styles.h1}>Risk averted board packet</Text>
				<View style={styles.metaRow}>
					<Text>Window: {payload.periodLabel}</Text>
					<Text>Prepared {payload.generatedAt}</Text>
				</View>

				<View style={styles.hero} wrap={false}>
					<View style={styles.heroMain}>
						<Text style={styles.heroLabel}>
							Risk averted · {payload.periodLabel}
						</Text>
						<Text style={styles.heroValue}>{payload.primaryFormatted}</Text>
						<Text style={styles.heroNarrative}>{payload.narrative}</Text>
					</View>
					<View style={styles.heroStats}>
						<View style={styles.statBlock}>
							<Text style={styles.statLabel}>Counted events</Text>
							<Text style={styles.statValue}>
								{payload.countedEventCount} of {payload.eventCount}
							</Text>
						</View>
						<View style={[styles.statBlock, styles.statDivided]}>
							<Text style={styles.statLabel}>Dollars counted</Text>
							<Text style={styles.statValue}>
								{payload.countedDollarsFormatted}
							</Text>
						</View>
						<View style={[styles.statBlock, styles.statDivided]}>
							<Text style={styles.statLabel}>Versus last year</Text>
							<Text style={[styles.statValue, { fontSize: 10 }]}>{yoy}</Text>
						</View>
					</View>
				</View>

				<View wrap={false}>
					<Text style={styles.h2}>How the figure is built</Text>
					<Text style={styles.body}>
						Each unique compliance flag, closed audit gap or on-time renewal
						counts once. {duplicates} of {payload.eventCount} logged event
						{payload.eventCount === 1 ? " is" : "s are"} listed for the record
						but not added to the total again. Live events only.
					</Text>
					<View style={styles.tableHeader}>
						<Text style={styles.bType}>Event type</Text>
						<Text style={[styles.bRecorded, styles.right]}>Recorded</Text>
						<Text style={[styles.bCounted, styles.right]}>Counted</Text>
						<Text style={styles.bTrend}>Vs last quarter</Text>
						<Text style={[styles.bDollars, styles.right]}>Dollars counted</Text>
					</View>
					{drivers.map((d) => (
						<View key={d.kind} style={styles.tableRow}>
							<Text style={styles.bType}>{d.label}</Text>
							<Text style={[styles.bRecorded, styles.right]}>{d.count}</Text>
							<Text style={[styles.bCounted, styles.right]}>
								{countedByKind(d.kind)}
							</Text>
							<Text style={styles.bTrend}>{trendText(d.trend)}</Text>
							<Text style={[styles.bDollars, styles.right]}>
								{formatRiskUsdExact(
									sumCountedEventDollars(
										payload.events.filter((e) => e.kind === d.kind),
									),
								)}
							</Text>
						</View>
					))}
					<View style={styles.tableTotal}>
						<Text style={styles.bType}>Total</Text>
						<Text style={[styles.bRecorded, styles.right]}>
							{payload.eventCount}
						</Text>
						<Text style={[styles.bCounted, styles.right]}>
							{payload.countedEventCount}
						</Text>
						<Text style={styles.bTrend} />
						<Text style={[styles.bDollars, styles.right]}>
							{payload.countedDollarsFormatted}
						</Text>
					</View>
				</View>

				<View wrap={false}>
					<Text style={styles.h2}>Portfolio protected</Text>
					<Text style={[styles.small, { marginBottom: 4 }]}>
						Face value under active monitoring, by record type.
					</Text>
					<View style={styles.tableHeader}>
						<Text style={{ width: "50%" }}>Record type</Text>
						<Text style={[{ width: "20%" }, styles.right]}>Records</Text>
						<Text style={[{ width: "30%" }, styles.right]}>Face value</Text>
					</View>
					{(["contracts", "licenses", "grants"] as const).map((k) => (
						<View key={k} style={styles.tableRow}>
							<Text style={{ width: "50%", textTransform: "capitalize" }}>
								{k}
							</Text>
							<Text style={[{ width: "20%" }, styles.right]}>
								{payload.portfolio.byType[k].count}
							</Text>
							<Text style={[{ width: "30%" }, styles.right]}>
								{formatRiskUsdExact(payload.portfolio.byType[k].amount)}
							</Text>
						</View>
					))}
					<View style={styles.tableTotal}>
						<Text style={{ width: "70%" }}>Total</Text>
						<Text style={[{ width: "30%" }, styles.right]}>
							{payload.portfolio.amountFormatted}
						</Text>
					</View>
				</View>

				<View style={styles.twoCol} wrap={false}>
					<View style={styles.col}>
						<Text style={[styles.h2, { color: RUST }]}>
							Still-open exposure
						</Text>
						<Text style={styles.small}>
							{openTotal > 0
								? "Not yet resolved. Never part of the headline."
								: "Nothing outstanding across contracts and licenses."}
						</Text>
						<Figure
							label={`High-risk records (Contract ${payload.openRisk.byType.contracts.highRisk} · License ${payload.openRisk.byType.licenses.highRisk})`}
							value={payload.openRisk.highRisk}
							color={RUST}
						/>
						<Figure
							label={`Expiring within 90 days (Contract ${payload.openRisk.byType.contracts.expiring90} · License ${payload.openRisk.byType.licenses.expiring90})`}
							value={payload.openRisk.expiring90}
							color={RUST}
						/>
						<Figure
							label={`Expired, still open (Contract ${payload.openRisk.byType.contracts.expired} · License ${payload.openRisk.byType.licenses.expired})`}
							value={payload.openRisk.expired}
							color={RUST}
						/>
					</View>
					<View style={styles.col}>
						<Text style={styles.h2}>Inventory monitored</Text>
						<Text style={styles.small}>
							What CAALM watches on the organization's behalf.
						</Text>
						<Figure
							label="Contracts"
							value={payload.monitoring.contractsMonitored}
							color={BLUE}
						/>
						<Figure
							label="Licenses"
							value={payload.monitoring.licensesMonitored}
							color={BLUE}
						/>
						<Figure
							label="Grants"
							value={payload.monitoring.grantsMonitored}
							color={BLUE}
						/>
						<Figure
							label="Clauses flagged"
							value={payload.monitoring.clausesFlagged}
							color={BLUE}
						/>
					</View>
				</View>

				<View wrap={events.length > 25}>
					<Text style={styles.h2}>Event register</Text>
					<Text style={[styles.small, { marginBottom: 8 }]}>
						Every event behind the number, newest first. Greyed rows are not
						counted and carry no dollars.
					</Text>
					{events.length === 0 ? (
						<Text style={styles.small}>
							No live flags, gaps, or renewals in this window.
						</Text>
					) : (
						<>
							<View style={styles.tableHeader} fixed>
								<Text style={styles.colDate}>Date</Text>
								<Text style={styles.colKind}>Type</Text>
								<Text style={styles.colRecord}>Record</Text>
								<Text style={styles.colSource}>Source</Text>
								<Text style={[styles.colDollars, styles.right]}>Dollars</Text>
								<Text style={[styles.colCounted, styles.right]}>Counted</Text>
							</View>
							{events.map((event) => (
								<View
									key={event.id}
									style={[
										styles.tableRow,
										event.countedTowardTotal ? {} : styles.notCounted,
									]}
									wrap={false}
								>
									<Text style={styles.colDate}>
										{formatPdfDate(event.date)}
									</Text>
									<Text style={styles.colKind}>{KIND_LABELS[event.kind]}</Text>
									<Text style={styles.colRecord}>{event.recordName}</Text>
									<Text style={styles.colSource}>{event.source}</Text>
									<Text style={[styles.colDollars, styles.right]}>
										{event.countedTowardTotal ? event.dollarsFormatted : "$0"}
									</Text>
									<Text
										style={[
											styles.colCounted,
											styles.right,
											event.countedTowardTotal
												? { fontFamily: SANS_BOLD, color: GREEN }
												: {},
										]}
									>
										{event.countedTowardTotal ? "Yes" : "No"}
									</Text>
								</View>
							))}
							<View style={styles.tableTotal} wrap={false}>
								<Text style={{ width: "74%" }}>
									Total counted · {payload.countedEventCount} of{" "}
									{payload.eventCount}
								</Text>
								<Text style={[styles.colDollars, styles.right]}>
									{payload.countedDollarsFormatted}
								</Text>
								<Text style={styles.colCounted} />
							</View>
							{omitted > 0 ? (
								<Text style={[styles.small, { marginTop: 6 }]}>
									{omitted} additional event{omitted === 1 ? "" : "s"} omitted
									from this packet. Open Risk averted in CAALM for the full
									register.
								</Text>
							) : null}
						</>
					)}
					<Text style={[styles.small, { marginTop: 10 }]}>
						Sources: {sources}.
					</Text>

					<View wrap={false}>
						<Text style={styles.h2}>Method and definitions</Text>
						<View style={styles.defGrid}>
							{DEFINITIONS.map(([term, text]) => (
								<View key={term} style={styles.def}>
									<Text style={styles.defTerm}>{term}</Text>
									<Text style={styles.small}>{text}</Text>
								</View>
							))}
						</View>
					</View>
				</View>

				<PacketFooter org={payload.orgName} title="Risk averted board packet" />
			</Page>
		</Document>
	);
}
