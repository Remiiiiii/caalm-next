/**
 * Parse a negotiation version's extractedText (wizard markdown) into a
 * structured model: metadata card, numbered clauses, and clause lineage.
 * Paragraph offsets are into the RAW text so comment anchors stay valid.
 *
 * Bullet lines inside a clause become their own negotiable units so a
 * comment can sit on one sub-bullet without covering the whole section.
 */

import {
	isProtectedStructuralText,
	protectedPrefixLength,
} from "./protected-text";

export interface DocumentParagraph {
	start: number;
	end: number;
	text: string;
	/** True when this unit is a list item (- / * / •). */
	isBullet?: boolean;
	/** Absolute raw-text offset after a wizard-owned leading label. */
	protectedEnd?: number;
	/** False when accepting a replacement could change authored structure. */
	redlineAllowed?: boolean;
}

export interface DocumentMetadataEntry {
	label: string;
	value: string;
}

export interface DocumentClause {
	id: string;
	index: number;
	title: string;
	/** Italic source note, e.g. "Source: template · v1" */
	sourceNote: string;
	paragraphs: DocumentParagraph[];
}

export interface DocumentLineageEntry {
	title: string;
	familyId: string;
	version: number | null;
	source: string;
}

export interface NegotiationDocumentModel {
	title: string;
	metadata: DocumentMetadataEntry[];
	clauses: DocumentClause[];
	lineage: DocumentLineageEntry[];
	source: "docx" | "markdown";
	/** Every commentable paragraph (clause bodies + preamble prose). */
	negotiableParagraphs: DocumentParagraph[];
}

export function isDocxNegotiationSnapshot(text: string): boolean {
	return text.trimStart().startsWith("<!-- negotiation-snapshot:docx -->");
}

export function isThinNegotiationSnapshot(text: string): boolean {
	const headings = text.match(/^##\s+\d+[.)]\s+.+$/gm) || [];
	return !isDocxNegotiationSnapshot(text) && headings.length < 2;
}

/** splitParagraphs (diff.service) semantics, but keeping raw-text offsets. */
export function splitParagraphsWithOffsets(text: string): DocumentParagraph[] {
	const out: DocumentParagraph[] = [];
	const regex = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
	let match = regex.exec(text);
	while (match) {
		const raw = match[0];
		const trimmed = raw.trim();
		if (trimmed) {
			const leading = raw.length - raw.trimStart().length;
			const start = match.index + leading;
			out.push({ start, end: start + trimmed.length, text: trimmed });
		}
		match = regex.exec(text);
	}
	return out;
}

const BULLET_LINE_RE = /^([-*•]|\d+[.)])\s+/;
const MD_HEADING_RE = /^#{2,3}\s*(?:(\d+)[.)]\s*)?(.+)$/;
/** Plain numbered section titles from DOCX-style bodies (no markdown ##). */
const PLAIN_SECTION_RE = /^(\d+)[.)]\s+([A-Z][A-Z0-9 &/'(),.-]{1,80})$/;
const METADATA_LINE_RE = /^[-•]\s*([^:]{1,40}):\s*(.+)$/;
const LINEAGE_LINE_RE = /^[-•]\s*(.+?)\s*\(([\w-]+)\s+v(\d+),\s*([\w-]+)\)\s*$/;

/**
 * Split a blank-line block into anchorable units: each bullet/list line is
 * its own unit; consecutive prose lines stay one unit. Offsets stay in the
 * original block (and therefore the full document text).
 */
export function splitBlockIntoUnits(
	block: DocumentParagraph,
): DocumentParagraph[] {
	const lines = block.text.split("\n");
	if (lines.length <= 1) {
		const isBullet = BULLET_LINE_RE.test(block.text.trim());
		return [{ ...block, isBullet }];
	}

	const units: DocumentParagraph[] = [];
	let proseStart: number | null = null;
	let proseEnd = 0;
	let proseParts: string[] = [];
	let cursor = block.start;

	const flushProse = () => {
		if (proseStart == null || proseParts.length === 0) {
			proseStart = null;
			proseParts = [];
			return;
		}
		const text = proseParts.join("\n");
		units.push({
			start: proseStart,
			end: proseEnd,
			text,
			isBullet: false,
		});
		proseStart = null;
		proseParts = [];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineStart = cursor;
		const lineEnd = cursor + line.length;
		// +1 for the newline that separated this line (except after last)
		cursor = lineEnd + (i < lines.length - 1 ? 1 : 0);

		const trimmed = line.trim();
		if (!trimmed) continue;

		const leading = line.length - line.trimStart().length;
		const unitStart = lineStart + leading;
		const unitEnd = unitStart + trimmed.length;

		if (BULLET_LINE_RE.test(trimmed)) {
			flushProse();
			units.push({
				start: unitStart,
				end: unitEnd,
				text: trimmed,
				isBullet: true,
			});
		} else {
			if (proseStart == null) proseStart = unitStart;
			proseParts.push(trimmed);
			proseEnd = unitEnd;
		}
	}
	flushProse();
	return units.length > 0 ? units : [{ ...block, isBullet: false }];
}

function pushUnits(clause: DocumentClause, block: DocumentParagraph) {
	const units = splitBlockIntoUnits(block).map((unit) => {
		const prefixLength = protectedPrefixLength(unit.text);
		const protectedEnd = prefixLength ? unit.start + prefixLength : undefined;
		return {
			...unit,
			protectedEnd,
			redlineAllowed: prefixLength > 0 || !isProtectedStructuralText(unit.text),
		};
	});
	clause.paragraphs.push(...units);
}

function parseMetadataBlock(paragraph: string): DocumentMetadataEntry[] | null {
	const lines = paragraph
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return null;
	const entries: DocumentMetadataEntry[] = [];
	for (const line of lines) {
		const match = METADATA_LINE_RE.exec(line);
		if (!match) return null;
		entries.push({ label: match[1].trim(), value: match[2].trim() });
	}
	return entries;
}

function parseLineageBlock(paragraph: string): DocumentLineageEntry[] {
	const entries: DocumentLineageEntry[] = [];
	for (const line of paragraph.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const match = LINEAGE_LINE_RE.exec(trimmed);
		if (match) {
			entries.push({
				title: match[1].trim(),
				familyId: match[2],
				version: Number(match[3]),
				source: match[4],
			});
		} else if (/^[-•]\s*/.test(trimmed)) {
			entries.push({
				title: trimmed.replace(/^[-•]\s*/, ""),
				familyId: "",
				version: null,
				source: "",
			});
		}
	}
	return entries;
}

function isSourceNote(line: string): boolean {
	return /^_.*_$/.test(line) || /^Source:\s+/i.test(line);
}

function isLetterheadNoise(paragraph: string): boolean {
	// PDF letterhead lines must never become negotiable body text.
	const lower = paragraph.toLowerCase();
	if (/^caalm\s+solutions/i.test(paragraph.trim())) return true;
	if (
		/\b(miami|fl\s+\d{5}|support@|www\.)\b/i.test(lower) &&
		paragraph.length < 200
	) {
		return (
			/logo|inc\.|llc|phone|tel:|address/i.test(lower) ||
			/^\S+@\S+/.test(paragraph)
		);
	}
	return false;
}

function clauseId(index: number, title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 48);
	return `clause-${index}-${slug || "section"}`;
}

export function parseNegotiationDocument(
	text: string,
): NegotiationDocumentModel {
	const paragraphs = splitParagraphsWithOffsets(text);
	const model: NegotiationDocumentModel = {
		title: "",
		metadata: [],
		clauses: [],
		lineage: [],
		source: isDocxNegotiationSnapshot(text) ? "docx" : "markdown",
		negotiableParagraphs: [],
	};

	let currentClause: DocumentClause | null = null;
	let inLineage = false;
	let sawMetadata = false;
	let preamble: DocumentClause | null = null;

	const pushClause = (clause: DocumentClause | null) => {
		if (clause && clause.paragraphs.length > 0) model.clauses.push(clause);
	};

	const ensurePreamble = () => {
		if (!preamble) {
			preamble = {
				id: "clause-preamble",
				index: 0,
				title: "",
				sourceNote: "",
				paragraphs: [],
			};
		}
		return preamble;
	};

	const startClause = (index: number, title: string) => {
		pushClause(currentClause);
		const clause: DocumentClause = {
			id: clauseId(index, title),
			index,
			title,
			sourceNote: "",
			paragraphs: [],
		};
		currentClause = clause;
		return clause;
	};

	for (const paragraph of paragraphs) {
		const firstLine = paragraph.text.split("\n")[0].trim();

		if (/^<!--\s*negotiation-snapshot:/i.test(firstLine)) continue;

		if (/^#\s+/.test(firstLine) && !model.title) {
			model.title = firstLine.replace(/^#\s+/, "").trim();
			const rest = paragraph.text.split("\n").slice(1).join("\n").trim();
			if (rest) {
				const entries = parseMetadataBlock(rest);
				if (entries) {
					model.metadata = entries;
					sawMetadata = true;
				}
			}
			continue;
		}

		if (/^###\s*clause lineage/i.test(firstLine)) {
			inLineage = true;
			continue;
		}
		if (inLineage) {
			model.lineage.push(...parseLineageBlock(paragraph.text));
			continue;
		}

		if (/^-{3,}$/.test(firstLine)) continue;
		if (isLetterheadNoise(paragraph.text)) continue;

		const mdHeading = MD_HEADING_RE.exec(firstLine);
		if (mdHeading && /^##/.test(firstLine)) {
			const activeClause = currentClause as DocumentClause | null;
			const index = mdHeading[1]
				? Number(mdHeading[1])
				: model.clauses.filter((c) => c.index > 0).length +
					(activeClause && activeClause.index > 0 ? 1 : 0) +
					1;
			const nextClause = startClause(index, mdHeading[2].trim());
			const rest = paragraph.text.split("\n").slice(1).join("\n").trim();
			if (rest) {
				const offset = paragraph.text.indexOf(rest);
				pushUnits(nextClause, {
					start: paragraph.start + offset,
					end: paragraph.start + offset + rest.length,
					text: rest,
				});
			}
			continue;
		}

		const plainSection = PLAIN_SECTION_RE.exec(firstLine);
		if (plainSection && paragraph.text.split("\n").length === 1) {
			startClause(Number(plainSection[1]), plainSection[2].trim());
			continue;
		}

		const activeClause = currentClause as DocumentClause | null;
		if (activeClause) {
			if (isSourceNote(firstLine) && !activeClause.sourceNote) {
				activeClause.sourceNote = firstLine
					.replace(/^_|_$/g, "")
					.replace(/^Source:\s*/i, "Source: ")
					.trim();
				continue;
			}
			pushUnits(activeClause, paragraph);
			continue;
		}

		// Before any clause heading: bullets = metadata, prose = preamble.
		if (!sawMetadata) {
			const entries = parseMetadataBlock(paragraph.text);
			if (entries) {
				model.metadata = entries;
				sawMetadata = true;
				continue;
			}
		}

		pushUnits(ensurePreamble(), paragraph);
	}
	pushClause(currentClause as DocumentClause | null);
	const preambleClause = preamble as DocumentClause | null;
	if (preambleClause && preambleClause.paragraphs.length > 0) {
		model.clauses.unshift(preambleClause);
	}

	model.negotiableParagraphs = model.clauses.flatMap(
		(clause) => clause.paragraphs,
	);
	return model;
}

export interface ClauseTocEntry {
	id: string;
	index: number;
	title: string;
	anchorStart: number;
}

export function buildClauseToc(clauses: DocumentClause[]): ClauseTocEntry[] {
	return clauses
		.filter((clause) => clause.index > 0)
		.map((clause) => ({
			id: clause.id,
			index: clause.index,
			title: clause.title,
			anchorStart: clause.paragraphs[0]?.start ?? 0,
		}));
}
