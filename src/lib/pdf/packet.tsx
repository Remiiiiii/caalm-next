import { Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

// Board-packet design shared by every CAALM PDF: eyebrow + serif title over a
// blue rule, ink/hairline neutrals, brand blue/teal accents, rust for exposure.
// shortcut: built-in Helvetica/Times stand in for Source Sans/Serif (react-pdf
// cannot load woff2), swap via Font.register.

// Stop mid-word breaks like "com-pare" in stat blocks.
Font.registerHyphenationCallback((word) => [word]);

export const INK = "#1b2230";
export const MUTED = "#5f6877";
export const HAIRLINE = "#d8dde4";
export const BLUE = "#0f5384";
export const TEAL = "#078FAB";
export const RUST = "#b4471c";
export const GREEN = "#15803d";
export const AMBER = "#b45309";
export const SERIF = "Times-Roman";
export const SERIF_BOLD = "Times-Bold";
export const SANS = "Helvetica";
export const SANS_BOLD = "Helvetica-Bold";

export const packet = StyleSheet.create({
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
		paddingBottom: 8,
		borderBottomWidth: 2,
		borderBottomColor: BLUE,
		fontSize: 8.5,
		color: MUTED,
	},
	h2: {
		fontSize: 13,
		fontFamily: SERIF_BOLD,
		color: BLUE,
		marginTop: 18,
		marginBottom: 4,
	},
	body: { fontSize: 9.5, color: INK, marginBottom: 8 },
	small: { fontSize: 8, color: MUTED },
	right: { textAlign: "right" },
	callout: {
		marginTop: 14,
		borderLeftWidth: 4,
		borderLeftColor: RUST,
		backgroundColor: "#fbf1ec",
		padding: 10,
		fontSize: 8.5,
		color: INK,
	},
	statRow: {
		flexDirection: "row",
		marginTop: 14,
		backgroundColor: "#eef7fb",
		borderLeftWidth: 4,
		borderLeftColor: TEAL,
	},
	stat: { flex: 1, padding: 12 },
	statDivided: { borderLeftWidth: 1, borderLeftColor: HAIRLINE },
	statLabel: { fontSize: 8, color: MUTED },
	statValue: {
		fontSize: 18,
		fontFamily: SERIF_BOLD,
		color: BLUE,
		marginTop: 2,
	},
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
	card: {
		borderWidth: 1,
		borderColor: HAIRLINE,
		padding: 12,
		marginBottom: 10,
	},
	cardTitle: {
		fontSize: 9,
		fontFamily: SANS_BOLD,
		color: BLUE,
		marginBottom: 8,
	},
	footer: {
		position: "absolute",
		top: 744,
		left: 52,
		right: 52,
		fontSize: 7.5,
		color: MUTED,
		borderTopWidth: 1,
		borderTopColor: HAIRLINE,
		paddingTop: 6,
		flexDirection: "row",
		justifyContent: "space-between",
	},
});

export function PacketHeader({
	eyebrow,
	title,
	left,
	right,
}: {
	eyebrow: string;
	title: string;
	left?: string;
	right?: string;
}) {
	return (
		<View>
			<Text style={packet.eyebrow}>{eyebrow}</Text>
			<Text style={packet.h1}>{title}</Text>
			{left || right ? (
				<View style={packet.metaRow}>
					<Text>{left}</Text>
					<Text>{right}</Text>
				</View>
			) : null}
		</View>
	);
}

/** Fixed footer on every page: "{org} · {title}" and "Page X of Y". */
export function PacketFooter({
	org,
	title,
	pageHeight = 792,
}: {
	org: string;
	title: string;
	pageHeight?: number;
}) {
	return (
		<View style={[packet.footer, { top: pageHeight - 48 }]} fixed>
			<Text>
				{org} · {title}
			</Text>
			<Text
				render={({ pageNumber, totalPages }) =>
					`Page ${pageNumber} of ${totalPages}`
				}
			/>
		</View>
	);
}

export function PacketPage({
	org,
	title,
	children,
}: {
	org: string;
	title: string;
	children?: ReactNode;
}) {
	return (
		<Page size="LETTER" style={packet.page}>
			{children}
			<PacketFooter org={org} title={title} />
		</Page>
	);
}

export function Heading({ children }: { children: ReactNode }) {
	return (
		<Text style={packet.h2} minPresenceAhead={60}>
			{children}
		</Text>
	);
}

/** Row of headline figures on the tinted teal band. */
export function StatBand({
	stats,
}: {
	stats: Array<{ label: string; value: string; color?: string }>;
}) {
	return (
		<View style={packet.statRow} wrap={false}>
			{stats.map((s, i) => (
				<View
					key={s.label}
					style={i === 0 ? packet.stat : [packet.stat, packet.statDivided]}
				>
					<Text style={packet.statLabel}>{s.label}</Text>
					<Text
						style={
							s.color
								? [packet.statValue, { color: s.color }]
								: packet.statValue
						}
					>
						{s.value}
					</Text>
				</View>
			))}
		</View>
	);
}

export type PacketColumn = {
	header: string;
	width: string;
	align?: "left" | "right";
};

/** Hairline table; the header row repeats on every page. */
export function PacketTable({
	columns,
	rows,
}: {
	columns: PacketColumn[];
	rows: string[][];
}) {
	const cell = (c: PacketColumn) => [
		{ width: c.width, paddingRight: 6 },
		c.align === "right" ? packet.right : {},
	];
	return (
		<View>
			<View style={packet.tableHeader} fixed>
				{columns.map((c) => (
					<Text key={c.header} style={cell(c)}>
						{c.header}
					</Text>
				))}
			</View>
			{rows.map((row, ri) => (
				<View key={`${ri}-${row[0]}`} style={packet.tableRow} wrap={false}>
					{columns.map((c, ci) => (
						<Text key={c.header} style={cell(c)}>
							{row[ci]}
						</Text>
					))}
				</View>
			))}
		</View>
	);
}

/** Labelled horizontal bar: track, fill, and a right-aligned value. */
export function BarRow({
	label,
	value,
	pct,
	color = BLUE,
}: {
	label: string;
	value: string;
	pct: number;
	color?: string;
}) {
	return (
		<View
			style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
			wrap={false}
		>
			<Text style={{ width: 96, fontSize: 8.5 }}>{label}</Text>
			<View
				style={{
					flex: 1,
					height: 8,
					backgroundColor: "#e6eaf0",
					marginRight: 8,
				}}
			>
				<View
					style={{
						height: 8,
						width: `${Math.max(0, Math.min(100, pct))}%`,
						backgroundColor: color,
					}}
				/>
			</View>
			<Text style={{ width: 34, fontSize: 8.5, textAlign: "right" }}>
				{value}
			</Text>
		</View>
	);
}

// Inline `**bold**`, `*italic*` and `` `code` `` into nested react-pdf Text.
function inlineMarkdown(text: string): ReactNode[] {
	return text
		.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g)
		.filter(Boolean)
		.map((part, i) => {
			const key = `${i}-${part.slice(0, 8)}`;
			if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
				return (
					<Text key={key} style={{ fontFamily: SANS_BOLD }}>
						{part.slice(2, -2)}
					</Text>
				);
			}
			if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
				return (
					<Text key={key} style={{ fontFamily: "Courier", color: BLUE }}>
						{part.slice(1, -1)}
					</Text>
				);
			}
			if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
				return (
					<Text key={key} style={{ fontFamily: "Helvetica-Oblique" }}>
						{part.slice(1, -1)}
					</Text>
				);
			}
			return part;
		});
}

/** Renders paragraphs, `#` headings and `*`/`-` bullets; raw markdown never reaches the PDF. */
export function MarkdownText({ text }: { text: string }) {
	const blocks = text
		.replace(/\r\n/g, "\n")
		.split(/\n{2,}/)
		.map((b) => b.trim())
		.filter(Boolean);
	return (
		<View>
			{blocks.map((block, bi) => (
				<View key={`${bi}-${block.slice(0, 12)}`} style={{ marginBottom: 8 }}>
					{block.split("\n").map((line, li) => {
						const bullet = /^\s*[*-]\s+(.*)$/.exec(line);
						const heading = /^#{1,6}\s+(.*)$/.exec(line);
						const key = `${li}-${line.slice(0, 12)}`;
						if (bullet) {
							return (
								<View
									key={key}
									style={{ flexDirection: "row", marginBottom: 3 }}
									wrap={false}
								>
									<Text style={{ width: 12, color: TEAL }}>•</Text>
									<Text style={{ flex: 1 }}>{inlineMarkdown(bullet[1])}</Text>
								</View>
							);
						}
						if (heading) {
							return (
								<Text
									key={key}
									style={{
										fontFamily: SANS_BOLD,
										color: BLUE,
										marginBottom: 3,
									}}
								>
									{inlineMarkdown(heading[1])}
								</Text>
							);
						}
						return (
							<Text key={key} style={{ marginBottom: 3 }}>
								{inlineMarkdown(line)}
							</Text>
						);
					})}
				</View>
			))}
		</View>
	);
}
