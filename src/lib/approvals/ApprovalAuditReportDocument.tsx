import {
	Document,
	Page,
	Polygon,
	StyleSheet,
	Svg,
	Text,
	View,
} from "@react-pdf/renderer";
import type {
	ApprovalAuditFact,
	ApprovalAuditOutcome,
	ApprovalAuditReportPayload,
	ApprovalAuditSectionMeta,
	ApprovalAuditStage,
	ApprovalAuditTimelineEvent,
} from "@/lib/approvals/approvalAuditReportPayload";

const NAVY = "#152A4A";
const TEAL = "#0E7C86";
const GREEN = "#1F9D55";
const GREEN_SOFT = "#E8F7EE";
const ORANGE = "#E8871E";
const RED = "#D64545";
const ZEBRA = "#F3F4F6";
const SLATE = "#374151";
const MUTED = "#6B7280";
const LINE = "#D1D5DB";
const ARROW_GRAY = "#9CA3AF";

const styles = StyleSheet.create({
	page: {
		fontFamily: "Helvetica",
		fontSize: 9,
		color: SLATE,
		paddingTop: 52,
		paddingBottom: 52,
		paddingHorizontal: 47,
	},
	header: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 36,
		backgroundColor: NAVY,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 47,
	},
	headerText: {
		color: "#ffffff",
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
	},
	headerMuted: {
		color: "#ffffff",
		fontSize: 8,
	},
	footer: {
		position: "absolute",
		bottom: 18,
		left: 47,
		right: 47,
		paddingTop: 8,
		paddingBottom: 4,
		borderTopWidth: 0.6,
		borderTopColor: LINE,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	footerText: {
		color: MUTED,
		fontSize: 7.5,
		lineHeight: 1.3,
	},
	title: {
		fontSize: 18,
		fontFamily: "Helvetica-Bold",
		color: NAVY,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 10,
		color: SLATE,
		marginBottom: 10,
	},
	heading: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: NAVY,
		paddingBottom: 4,
		marginBottom: 6,
		borderBottomWidth: 1.5,
		borderBottomColor: TEAL,
	},
	sectionDesc: {
		fontSize: 9,
		lineHeight: 1.4,
		color: SLATE,
		marginBottom: 10,
	},
	body: {
		fontSize: 9,
		lineHeight: 1.45,
		color: SLATE,
		marginBottom: 8,
	},
	flagIntro: {
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: SLATE,
		marginTop: 4,
		marginBottom: 2,
	},
	flagInline: {
		fontSize: 9,
		lineHeight: 1.45,
		color: SLATE,
	},
	sodNote: {
		fontSize: 8,
		lineHeight: 1.4,
		color: MUTED,
		marginTop: 10,
	},
	sodPrefix: {
		fontFamily: "Helvetica-Bold",
		color: SLATE,
	},
	pills: {
		flexDirection: "row",
		gap: 6,
		marginBottom: 14,
	},
	pill: {
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 3,
		color: "#ffffff",
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
	},
	factsGrid: {
		marginBottom: 14,
	},
	factsRow: {
		flexDirection: "row",
		marginBottom: 12,
		gap: 24,
	},
	factCell: {
		flex: 1,
	},
	factLabel: {
		fontSize: 7,
		color: MUTED,
		textTransform: "uppercase",
		letterSpacing: 0.4,
		marginBottom: 3,
	},
	factValue: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: NAVY,
		lineHeight: 1.3,
	},
	table: {
		borderWidth: 0.4,
		borderColor: LINE,
		marginBottom: 10,
	},
	tr: {
		flexDirection: "row",
		borderBottomWidth: 0.4,
		borderBottomColor: LINE,
	},
	th: {
		color: "#ffffff",
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
	},
	tdCell: {
		padding: 5,
		justifyContent: "flex-start",
	},
	tdText: {
		fontSize: 8,
		color: SLATE,
		lineHeight: 1.35,
	},
	statusLine: {
		fontSize: 8,
		fontFamily: "Helvetica-Oblique",
		color: MUTED,
		textAlign: "center",
		marginTop: 4,
		marginBottom: 12,
		paddingHorizontal: 8,
	},
	notifHeading: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		color: TEAL,
		marginTop: 4,
		marginBottom: 8,
	},
	pipeline: {
		flexDirection: "row",
		alignItems: "stretch",
		marginBottom: 10,
		marginTop: 4,
		gap: 4,
	},
	stageCard: {
		flex: 1,
		borderWidth: 0.8,
		borderColor: LINE,
		borderRadius: 5,
		overflow: "hidden",
		backgroundColor: "#ffffff",
		minHeight: 118,
	},
	stageCap: {
		height: 6,
		backgroundColor: GREEN,
	},
	stageBody: {
		paddingHorizontal: 6,
		paddingTop: 8,
		paddingBottom: 8,
		alignItems: "center",
		position: "relative",
	},
	stageTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		marginBottom: 6,
		gap: 4,
	},
	stageBadge: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: NAVY,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	stageBadgeText: {
		color: "#ffffff",
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		textAlign: "center",
	},
	stageTitle: {
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: NAVY,
		textAlign: "center",
		textTransform: "uppercase",
		flexShrink: 1,
	},
	stageStatusPill: {
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 2,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: GREEN,
		backgroundColor: GREEN_SOFT,
		marginBottom: 8,
		textTransform: "uppercase",
	},
	stageName: {
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: "#111827",
		textAlign: "center",
		marginBottom: 2,
	},
	stageRole: {
		fontSize: 7,
		color: MUTED,
		textAlign: "center",
		marginBottom: 6,
	},
	stageDivider: {
		width: "80%",
		height: 0.6,
		backgroundColor: LINE,
		marginBottom: 6,
	},
	stageTime: {
		fontSize: 7,
		color: MUTED,
		textAlign: "center",
	},
	arrowWrap: {
		width: 12,
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "center",
		flexShrink: 0,
	},
	timelineBlock: {
		marginBottom: 10,
		height: 168,
	},
	timelineBaseline: {
		position: "absolute",
		left: 8,
		right: 8,
		top: 84,
		height: 1.6,
		backgroundColor: LINE,
	},
	timelineRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		height: 168,
		paddingHorizontal: 4,
		gap: 4,
	},
	timelineCol: {
		width: "15.8%",
		height: 168,
		alignItems: "center",
		position: "relative",
	},
	timelineCard: {
		width: "100%",
		minHeight: 48,
		borderWidth: 0.8,
		borderColor: LINE,
		borderRadius: 4,
		padding: 4,
		paddingLeft: 6,
		backgroundColor: "#ffffff",
	},
	timelineCardAt: {
		fontSize: 5.5,
		fontFamily: "Helvetica-Bold",
		color: "#111827",
		marginBottom: 1,
	},
	timelineCardAction: {
		fontSize: 6,
		fontFamily: "Helvetica-Bold",
		marginBottom: 1,
	},
	timelineCardActor: {
		fontSize: 5.5,
		color: MUTED,
	},
	timelineDot: {
		width: 9,
		height: 9,
		borderRadius: 5,
		position: "absolute",
		top: 80,
		zIndex: 2,
	},
	timelineStem: {
		width: 1,
		position: "absolute",
		left: "50%",
	},
	takeaway: {
		fontSize: 9,
		lineHeight: 1.45,
		color: SLATE,
		marginTop: 6,
	},
});

function pillColor(label: string): string {
	const key = label.toUpperCase();
	if (/(ACTIVAT|COMPLETE|APPROV|SUCCESS|ON TRACK)/.test(key)) return GREEN;
	if (/(PENDING|REVIEW|WARN|AT RISK|CHANGE)/.test(key)) return ORANGE;
	if (/(REJECT|FAIL|BREACH)/.test(key)) return RED;
	return TEAL;
}

function outcomeColor(outcome: ApprovalAuditOutcome): string {
	if (outcome === "ok") return GREEN;
	if (outcome === "warn") return ORANGE;
	if (outcome === "fail") return RED;
	return TEAL;
}

function pairFacts(facts: ApprovalAuditFact[]): ApprovalAuditFact[][] {
	const rows: ApprovalAuditFact[][] = [];
	for (let i = 0; i < facts.length; i += 2) {
		rows.push(facts.slice(i, i + 2));
	}
	return rows;
}

function chunk<T>(items: T[], size: number): T[][] {
	const rows: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		rows.push(items.slice(i, i + size));
	}
	return rows;
}

function pickTimeline(
	events: ApprovalAuditTimelineEvent[],
): ApprovalAuditTimelineEvent[] {
	if (events.length <= 8) return events;
	const last = events.length - 1;
	const indexes = [
		...new Set(
			Array.from({ length: 8 }, (_, i) => Math.round((i * last) / 7)),
		),
	].sort((a, b) => a - b);
	return indexes.map((i) => events[i]);
}

function Chrome({ payload }: { payload: ApprovalAuditReportPayload }) {
	return (
		<>
			<View style={styles.header} fixed>
				<Text style={styles.headerText}>{payload.companyName}</Text>
				<Text style={styles.headerMuted}>CONFIDENTIAL — INTERNAL USE</Text>
			</View>
			<View style={styles.footer} fixed>
				<Text style={styles.footerText}>{payload.footerLine}</Text>
				<Text
					style={styles.footerText}
					render={({ pageNumber }) => `Page ${pageNumber}`}
				/>
			</View>
		</>
	);
}

function FactsGrid({ facts }: { facts: ApprovalAuditFact[] }) {
	return (
		<View style={styles.factsGrid}>
			{pairFacts(facts).map((pair, index) => (
				<View key={`${pair[0]?.label}-${index}`} style={styles.factsRow}>
					{pair.map((item) =>
						item ? (
							<View key={item.label} style={styles.factCell}>
								<Text style={styles.factLabel}>{item.label}</Text>
								<Text style={styles.factValue}>{item.value || "—"}</Text>
							</View>
						) : (
							<View key={`empty-${index}`} style={styles.factCell} />
						),
					)}
					{pair.length === 1 ? <View style={styles.factCell} /> : null}
				</View>
			))}
		</View>
	);
}

function SectionHeading({
	section,
}: {
	section: ApprovalAuditSectionMeta;
}) {
	return (
		<>
			<Text style={styles.heading}>
				{section.number}. {section.title}
			</Text>
			{section.description ? (
				<Text style={styles.sectionDesc}>{section.description}</Text>
			) : null}
		</>
	);
}

function PipelineArrow() {
	return (
		<View style={styles.arrowWrap}>
			<Svg width={12} height={10} viewBox="0 0 16 12">
				{/* Thick shaft */}
				<Polygon
					points="0,4.5 9,4.5 9,7.5 0,7.5"
					fill={ARROW_GRAY}
				/>
				{/* Arrow head */}
				<Polygon points="8,0 16,6 8,12" fill={ARROW_GRAY} />
			</Svg>
		</View>
	);
}

function StageBox({ stage }: { stage: ApprovalAuditStage }) {
	const isComplete = /COMPLETE|ACTIVAT|APPROV/i.test(stage.status);
	const statusColor = isComplete ? GREEN : pillColor(stage.status);
	return (
		<View style={styles.stageCard}>
			<View
				style={[
					styles.stageCap,
					{ backgroundColor: isComplete ? GREEN : statusColor },
				]}
			/>
			<View style={styles.stageBody}>
				{/* Number + title in one row so the badge never covers the label */}
				<View style={styles.stageTitleRow}>
					<View style={styles.stageBadge}>
						<Text style={styles.stageBadgeText}>{String(stage.number)}</Text>
					</View>
					<Text style={styles.stageTitle}>{stage.name}</Text>
				</View>
				<Text
					style={[
						styles.stageStatusPill,
						{
							backgroundColor: isComplete ? GREEN_SOFT : ZEBRA,
							color: statusColor,
						},
					]}
				>
					{stage.status}
				</Text>
				<Text style={styles.stageName}>{stage.assignees || "—"}</Text>
				<Text style={styles.stageRole}>{stage.role || "—"}</Text>
				<View style={styles.stageDivider} />
				<Text style={styles.stageTime}>{stage.timestamp || "—"}</Text>
			</View>
		</View>
	);
}

const TIMELINE_PER_ROW = 6;

function TimelineRow({ events }: { events: ApprovalAuditTimelineEvent[] }) {
	const padded = [...events];
	while (padded.length < TIMELINE_PER_ROW) {
		padded.push({
			at: "",
			action: "",
			actor: "",
			outcome: "info",
		});
	}

	return (
		<View style={styles.timelineBlock}>
			<View style={styles.timelineBaseline} />
			<View style={styles.timelineRow}>
				{padded.map((event, index) => {
					const color = outcomeColor(event.outcome);
					const above = index % 2 === 0;
					const empty = !event.action;
					return (
						<View
							key={`${event.at}-${event.action}-${index}`}
							style={styles.timelineCol}
						>
							{/* Card above */}
							<View
								style={{
									position: "absolute",
									top: 8,
									left: 0,
									right: 0,
									opacity: above && !empty ? 1 : 0,
								}}
							>
								<View
									style={[
										styles.timelineCard,
										{
											borderColor: color,
											borderLeftWidth: 2.5,
											borderLeftColor: color,
										},
									]}
								>
									<Text style={styles.timelineCardAt}>{event.at}</Text>
									<Text style={[styles.timelineCardAction, { color }]}>
										{event.action}
									</Text>
									<Text style={styles.timelineCardActor}>{event.actor}</Text>
								</View>
							</View>

							{/* Stem above */}
							{above && !empty ? (
								<View
									style={[
										styles.timelineStem,
										{
											backgroundColor: color,
											top: 64,
											height: 16,
											marginLeft: -0.5,
										},
									]}
								/>
							) : null}

							{/* Dot on baseline */}
							{!empty ? (
								<View
									style={[styles.timelineDot, { backgroundColor: color }]}
								/>
							) : null}

							{/* Stem below */}
							{!above && !empty ? (
								<View
									style={[
										styles.timelineStem,
										{
											backgroundColor: color,
											top: 89,
											height: 16,
											marginLeft: -0.5,
										},
									]}
								/>
							) : null}

							{/* Card below */}
							<View
								style={{
									position: "absolute",
									bottom: 8,
									left: 0,
									right: 0,
									opacity: !above && !empty ? 1 : 0,
								}}
							>
								<View
									style={[
										styles.timelineCard,
										{
											borderColor: color,
											borderLeftWidth: 2.5,
											borderLeftColor: color,
										},
									]}
								>
									<Text style={styles.timelineCardAt}>{event.at}</Text>
									<Text style={[styles.timelineCardAction, { color }]}>
										{event.action}
									</Text>
									<Text style={styles.timelineCardActor}>{event.actor}</Text>
								</View>
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
}

function DataTable({
	headers,
	rows,
	flexes,
}: {
	headers: string[];
	rows: Array<Array<string | { text: string; color?: string; bold?: boolean }>>;
	flexes: number[];
}) {
	return (
		<View style={styles.table}>
			<View style={styles.tr}>
				{headers.map((h, i) => (
					<View key={h} style={[styles.tdCell, { flex: flexes[i] || 1, backgroundColor: NAVY }]}>
						<Text style={[styles.th]}>{h}</Text>
					</View>
				))}
			</View>
			{rows.map((row, index) => (
				<View
					key={`row-${index}`}
					style={[styles.tr, index % 2 === 1 ? { backgroundColor: ZEBRA } : {}]}
				>
					{row.map((cell, ci) => {
						const text = typeof cell === "string" ? cell : cell.text;
						const color =
							typeof cell === "string" ? SLATE : cell.color || SLATE;
						const bold = typeof cell !== "string" && cell.bold;
						return (
							/* View wrapper keeps each cell in its column — Text+flex alone overlaps in react-pdf */
							<View
								key={`${index}-${ci}`}
								style={[styles.tdCell, { flex: flexes[ci] || 1 }]}
							>
								<Text
									style={[
										styles.tdText,
										{
											color,
											fontFamily: bold ? "Helvetica-Bold" : "Helvetica",
										},
									]}
								>
									{text || "—"}
								</Text>
							</View>
						);
					})}
				</View>
			))}
		</View>
	);
}

export function ApprovalAuditReportDocument({
	payload,
}: {
	payload: ApprovalAuditReportPayload;
}) {
	const timelineEvents = pickTimeline(payload.timeline);
	const timelineRows = chunk(timelineEvents, TIMELINE_PER_ROW);
	const flaggingText = payload.cover.flagging
		.map((item, i) => `(${i + 1}) ${item}`)
		.join(" ");

	return (
		<Document title={payload.reportTitle} author={payload.companyName}>
			{/* Page 1 — Cover */}
			<Page size="LETTER" style={styles.page}>
				<Chrome payload={payload} />
				<Text style={styles.title}>{payload.cover.title}</Text>
				<Text style={styles.subtitle}>{payload.cover.subtitle}</Text>
				<View style={styles.pills}>
					{payload.cover.statusPills.map((pill) => (
						<Text
							key={pill}
							style={[styles.pill, { backgroundColor: pillColor(pill) }]}
						>
							{pill}
						</Text>
					))}
				</View>
				<FactsGrid facts={payload.cover.facts} />
				<Text style={styles.heading}>Executive Summary</Text>
				<Text style={styles.body}>{payload.cover.executiveSummary}</Text>
				<Text style={styles.flagIntro}>{payload.cover.flaggingIntro}</Text>
				<Text style={styles.flagInline}>{flaggingText}</Text>
			</Page>

			{/* Page 2 — Workflow + Notification */}
			<Page size="LETTER" style={styles.page}>
				<Chrome payload={payload} />
				<SectionHeading section={payload.sections.workflow} />
				<View style={styles.pipeline}>
					{payload.stages.slice(0, 6).flatMap((stage, index) => {
						const maxIndex = Math.min(5, payload.stages.length - 1);
						const nodes = [
							<View key={stage.name} style={{ flex: 1, minWidth: 0 }}>
								<StageBox stage={stage} />
							</View>,
						];
						if (index < maxIndex) {
							nodes.push(
								<PipelineArrow key={`arrow-${stage.name}`} />,
							);
						}
						return nodes;
					})}
				</View>

				<Text style={styles.statusLine}>{payload.workflowStatusLine}</Text>
				<Text style={styles.notifHeading}>
					Notification & Eligibility Detail
				</Text>
				<DataTable
					headers={[
						"Stage",
						"Eligible Approvers",
						"Assigned",
						"Notified",
						"SLA",
					]}
					flexes={[1.1, 2.2, 1.3, 1.3, 0.7]}
					rows={payload.stages.map((stage) => [
						stage.name,
						stage.eligible,
						stage.assigned,
						stage.notified,
						stage.sla,
					])}
				/>
			</Page>

			{/* Page 3 — Timeline */}
			<Page size="LETTER" style={styles.page}>
				<Chrome payload={payload} />
				<SectionHeading section={payload.sections.timeline} />
				{timelineRows.map((row) => (
					<TimelineRow
						key={row.map((e) => e.at + e.action).join("|")}
						events={row}
					/>
				))}
				<Text style={styles.takeaway}>{payload.timelineTakeaway}</Text>
			</Page>

			{/* Page 4 — Details + Parties */}
			<Page size="LETTER" style={styles.page}>
				<Chrome payload={payload} />
				<SectionHeading section={payload.sections.details} />
				<FactsGrid facts={payload.details.facts} />
				<SectionHeading section={payload.sections.parties} />
				<DataTable
					headers={["Name", "Email", "Role", "Function in This Approval"]}
					flexes={[1.1, 1.5, 1.2, 1.6]}
					rows={payload.details.parties.map((party) => [
						party.name,
						party.email,
						party.role,
						party.function,
					])}
				/>
				{payload.details.sodNote ? (
					<Text style={styles.sodNote}>
						<Text style={styles.sodPrefix}>Segregation-of-duties note: </Text>
						{payload.details.sodNote.replace(
							/^Segregation-of-duties note:\s*/i,
							"",
						)}
					</Text>
				) : null}
			</Page>

			{/* Page 5 — Full audit trail */}
			<Page size="LETTER" style={styles.page}>
				<Chrome payload={payload} />
				<SectionHeading section={payload.sections.audit} />
				<DataTable
					headers={["Timestamp", "Actor", "Action", "Result", "Detail"]}
					flexes={[1.4, 1.1, 1.2, 0.7, 1.8]}
					rows={payload.audit.map((row) => [
						row.at,
						row.actor,
						row.action,
						{
							text: row.result,
							bold: true,
							color: row.result === "Failed" ? RED : GREEN,
						},
						row.detail,
					])}
				/>
			</Page>
		</Document>
	);
}
