import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { WizardCustomBlock } from "@/types/contract-templates";
import {
	buildSignatureSectionXml,
	signaturePartiesForBlueprint,
} from "./signature-block";
import { isSignatureLockToken } from "./token-schema";

export type InjectedClause = {
	title: string;
	body: string;
};

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Strip tags/control chars so negotiation text is safe inside <w:t>. */
function stripControlChars(value: string): string {
	let out = "";
	for (const char of value) {
		const code = char.charCodeAt(0);
		if (code === 0x09 || code === 0x0a || code === 0x0d) {
			out += char;
			continue;
		}
		if (code < 0x20) continue;
		out += char;
	}
	return out;
}

function negotiationTextToPlain(text: string): string {
	return stripControlChars(
		text
			.split("\r\n")
			.join("\n")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
			.replace(/<[^>]+>/g, "")
			.replace(/&nbsp;/gi, " ")
			.replace(/&#(\d+);/g, (_, code) => {
				const n = Number(code);
				return Number.isFinite(n) && n > 0 ? String.fromCharCode(n) : "";
			})
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'"),
	).trim();
}

function sanitizeXmlText(value: string): string {
	return escapeXml(stripControlChars(value));
}

function paragraphPlainText(paragraphXml: string): string {
	return [...paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
		.map((match) => match[1])
		.join("")
		.replace(/\s+/g, " ")
		.trim();
}

function isListParagraph(paragraphXml: string): boolean {
	return /<w:numPr[\s>]/.test(paragraphXml);
}

function flattenParagraphInputs(paragraphs: string[]): string[] {
	const out: string[] = [];
	for (const block of paragraphs) {
		const trimmed = block.trim();
		if (!trimmed) continue;
		for (const line of trimmed.split(/\n+/)) {
			const row = line.trim();
			if (row) out.push(row);
		}
	}
	return out;
}

function findSampleNumberedHeadingParagraph(xml: string): string | null {
	const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
	for (const paragraph of paragraphs) {
		const plain = paragraphPlainText(paragraph);
		if (/^\d+\.\s+[A-Z]/.test(plain)) return paragraph;
	}
	return null;
}

function findSampleBodyParagraph(xml: string): string | null {
	const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
	let afterHeading = false;
	for (const paragraph of paragraphs) {
		const plain = paragraphPlainText(paragraph);
		if (/^\d+\.\s+[A-Z]/.test(plain)) {
			afterHeading = true;
			continue;
		}
		if (
			afterHeading &&
			plain.length >= 10 &&
			!/<w:color w:val="0F5384"/i.test(paragraph) &&
			!/DIGITAL\s+SIGNATURES/i.test(plain)
		) {
			return paragraph;
		}
	}
	return null;
}

function stripParagraphBorders(pPr: string): string {
	if (!pPr) return pPr;
	return pPr.replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/g, "");
}

function cloneParagraphWithText(sampleParagraph: string, text: string): string {
	const pPrMatch = sampleParagraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
	const rPrMatch = sampleParagraph.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
	const pPr = stripParagraphBorders(pPrMatch?.[0] ?? "");
	const rPr = rPrMatch?.[0] ?? "";
	const preserve = text.includes("  ") ? ' xml:space="preserve"' : "";
	return `<w:p>${pPr}<w:r>${rPr}<w:t${preserve}>${sanitizeXmlText(text)}</w:t></w:r></w:p>`;
}

function buildNumberedSectionHeading(
	heading: string,
	sourceXml?: string,
): string {
	const headingSample = sourceXml
		? findSampleNumberedHeadingParagraph(sourceXml)
		: null;
	if (headingSample) return cloneParagraphWithText(headingSample, heading);
	return `<w:p><w:r><w:rPr><w:b/><w:color w:val="0F5384"/></w:rPr><w:t>${sanitizeXmlText(heading)}</w:t></w:r></w:p>`;
}

function buildBodyParagraph(text: string, sourceXml?: string): string {
	const bodySample = sourceXml ? findSampleBodyParagraph(sourceXml) : null;
	if (bodySample) return cloneParagraphWithText(bodySample, text);
	return `<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${sanitizeXmlText(text)}</w:t></w:r></w:p>`;
}

function buildNegotiationBodyParagraph(
	text: string,
	sourceXml: string,
): string {
	const sample = findSampleBodyParagraph(sourceXml);
	const pPrMatch = sample?.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
	const rPrMatch = sample?.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
	const pPr = stripParagraphBorders(pPrMatch?.[0] ?? "");
	const rPr = rPrMatch?.[0] ?? "";
	const normalized = negotiationTextToPlain(text).replace(/^[-*]\s+/, "• ");
	if (!normalized) {
		return `<w:p>${pPr}</w:p>`;
	}
	const runs = normalized.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
	const runXml = runs
		.map((part) => {
			const bold = /^\*\*[^*]+\*\*$/.test(part);
			const value = bold ? part.slice(2, -2) : part;
			const boldTag = bold ? "<w:b/>" : "";
			const properties = rPr
				? rPr.replace(/<w:rPr>/, `<w:rPr>${boldTag}`)
				: `<w:rPr>${boldTag}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr>`;
			return `<w:r>${properties}<w:t xml:space="preserve">${sanitizeXmlText(value)}</w:t></w:r>`;
		})
		.join("");
	return `<w:p>${pPr}${runXml}</w:p>`;
}

function normalizedSectionTitle(value: string): string {
	return value
		.replace(/\*\*/g, "")
		.replace(/[^a-z0-9]+/gi, " ")
		.trim()
		.toLowerCase();
}

export interface NegotiationPdfSection {
	index: number;
	title: string;
	paragraphs: string[];
}

export interface NegotiationSectionReplaceResult {
	docx: Buffer;
	replacedSectionIndexes: number[];
}

/**
 * Replace the editable body inside a merged DOCX while preserving letterhead,
 * section headings, and signature blocks from the blueprint.
 */
export function replaceNegotiationSectionsInDocx(
	docx: Buffer,
	sections: NegotiationPdfSection[],
	documentTitle: string,
): Buffer {
	return replaceNegotiationSectionsInDocxDetailed(docx, sections, documentTitle)
		.docx;
}

/**
 * Same as replaceNegotiationSectionsInDocx, plus which section indexes were
 * rewritten (so preview can refuse a stale blueprint PDF).
 */
export function replaceNegotiationSectionsInDocxDetailed(
	docx: Buffer,
	sections: NegotiationPdfSection[],
	documentTitle: string,
): NegotiationSectionReplaceResult {
	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) return { docx, replacedSectionIndexes: [] };
	const xml = file.asText();
	const paragraphRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
	const paragraphs: Array<{
		start: number;
		end: number;
		xml: string;
		text: string;
	}> = [];
	let match: RegExpExecArray | null = paragraphRe.exec(xml);
	while (match) {
		paragraphs.push({
			start: match.index,
			end: match.index + match[0].length,
			xml: match[0],
			text: paragraphPlainText(match[0]),
		});
		match = paragraphRe.exec(xml);
	}

	// Never splice past </w:body> — that deletes closing tags and Adobe rejects the file.
	const bodyClose = xml.lastIndexOf("</w:body>");
	const hardEnd = bodyClose >= 0 ? bodyClose : xml.length;

	const signatureStart =
		paragraphs.find((paragraph) =>
			/^(GRANTOR|GRANTEE|SIGNATURE|CONTRACTOR|VENDOR|CLIENT)$/i.test(
				paragraph.text.trim(),
			),
		)?.start ??
		findSignaturesParagraphIndex(xml) ??
		hardEnd;
	const numbered = paragraphs
		.map((paragraph) => ({
			...paragraph,
			heading: /^(\d+)[.)]\s+(.+)$/.exec(paragraph.text.trim()),
		}))
		.filter((paragraph) => paragraph.heading);

	const replacements: Array<{
		start: number;
		end: number;
		value: string;
		sectionIndex: number;
	}> = [];

	const bodyParagraphsXml = (paragraphTexts: string[]): string =>
		flattenParagraphInputs(paragraphTexts.map(negotiationTextToPlain))
			.map((text) => buildNegotiationBodyParagraph(text, xml))
			.join("");

	/**
	 * Swap section body text without dropping tables/bookmarks/drawings.
	 * Like dokkit: only remove <w:p> nodes in the range; keep everything else.
	 */
	const replaceParagraphsPreserveStructure = (
		slice: string,
		newParasXml: string,
	): string => {
		const preserved = slice.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, "");
		return `${newParasXml}${preserved}`;
	};

	for (const section of sections.filter((item) => item.index > 0)) {
		// Prefer index+title, then title-only (wizard may renumber ADDITIONAL TERMS),
		// then index-only as a last resort.
		const heading =
			numbered.find(
				(item) =>
					Number(item.heading?.[1]) === section.index &&
					normalizedSectionTitle(item.heading?.[2] || "") ===
						normalizedSectionTitle(section.title),
			) ||
			numbered.find(
				(item) =>
					normalizedSectionTitle(item.heading?.[2] || "") ===
					normalizedSectionTitle(section.title),
			) ||
			numbered.find((item) => Number(item.heading?.[1]) === section.index);
		if (!heading) continue;
		const nextHeading = numbered.find((item) => item.start > heading.start);
		const end = Math.min(
			nextHeading?.start ?? hardEnd,
			signatureStart,
			hardEnd,
		);
		if (end < heading.end) continue;
		const slice = xml.slice(heading.end, end);
		replacements.push({
			start: heading.end,
			end,
			value: replaceParagraphsPreserveStructure(
				slice,
				bodyParagraphsXml(section.paragraphs),
			),
			sectionIndex: section.index,
		});
	}

	const preamble = sections.find((section) => section.index === 0);
	if (preamble?.paragraphs.length && numbered[0]) {
		const titleParagraph = paragraphs.find(
			(paragraph) =>
				normalizedSectionTitle(paragraph.text) ===
				normalizedSectionTitle(documentTitle),
		);
		if (titleParagraph && titleParagraph.end < numbered[0].start) {
			const end = Math.min(numbered[0].start, hardEnd);
			const slice = xml.slice(titleParagraph.end, end);
			replacements.push({
				start: titleParagraph.end,
				end,
				value: replaceParagraphsPreserveStructure(
					slice,
					bodyParagraphsXml(preamble.paragraphs),
				),
				sectionIndex: 0,
			});
		}
	}

	const replacedSectionIndexes = [
		...new Set(replacements.map((row) => row.sectionIndex)),
	].sort((a, b) => a - b);

	if (replacements.length === 0) {
		return { docx, replacedSectionIndexes: [] };
	}

	let nextXml = xml;
	for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
		nextXml =
			nextXml.slice(0, replacement.start) +
			replacement.value +
			nextXml.slice(replacement.end);
	}
	const openP = (nextXml.match(/<w:p\b/g) || []).length;
	const closeP = (nextXml.match(/<\/w:p>/g) || []).length;
	if (
		!nextXml.includes("</w:body>") ||
		!nextXml.includes("</w:document>") ||
		openP !== closeP
	) {
		return { docx, replacedSectionIndexes: [] };
	}
	zip.file("word/document.xml", nextXml);
	return {
		docx: zip.generate({ type: "nodebuffer" }) as Buffer,
		replacedSectionIndexes,
	};
}

function buildBodyParagraphs(body: string, sourceXml?: string): string[] {
	return flattenParagraphInputs([body]).map((text) =>
		buildBodyParagraph(text, sourceXml),
	);
}

function buildClauseSubheading(title: string): string {
	const trimmed = title.trim();
	if (!trimmed) return "";
	return `<w:p><w:r><w:rPr><w:b/><w:color w:val="0F5384"/></w:rPr><w:t>${sanitizeXmlText(trimmed)}</w:t></w:r></w:p>`;
}

export function buildSupplementalDocumentBlocks(input: {
	injectedClauses?: InjectedClause[];
	customBlockBodies?: string[];
	sourceXml?: string;
	startNumber: number;
}): string {
	const parts: string[] = [];
	let nextNumber = input.startNumber;

	const clauses = (input.injectedClauses || []).filter(
		(clause) => clause.title.trim() || clause.body.trim(),
	);
	if (clauses.length > 0) {
		parts.push(
			buildNumberedSectionHeading(`${nextNumber}. CLAUSES`, input.sourceXml),
		);
		nextNumber += 1;
		for (const clause of clauses) {
			const subheading = buildClauseSubheading(clause.title);
			if (subheading) parts.push(subheading);
			parts.push(...buildBodyParagraphs(clause.body, input.sourceXml));
		}
	}

	const customBodies = flattenParagraphInputs(input.customBlockBodies || []);
	if (customBodies.length > 0) {
		parts.push(
			buildNumberedSectionHeading(
				`${nextNumber}. ADDITIONAL TERMS`,
				input.sourceXml,
			),
		);
		parts.push(
			...customBodies.map((text) => buildBodyParagraph(text, input.sourceXml)),
		);
	}

	return parts.join("");
}

const DEFAULT_BODY_FONT = {
	ascii: "Times New Roman",
	hAnsi: "Times New Roman",
};

const PLACEHOLDER_FONT_PATTERN =
	/consolas|courier|monaco|lucida console|monospace/i;

function canonicalFontName(name: string): string {
	const trimmed = name.trim();
	if (/^times$/i.test(trimmed)) return "Times New Roman";
	return trimmed;
}

function parseRunFonts(
	rFontsTag: string,
): { ascii: string; hAnsi: string } | null {
	const ascii = rFontsTag.match(/w:ascii="([^"]*)"/)?.[1];
	const hAnsi = rFontsTag.match(/w:hAnsi="([^"]*)"/)?.[1];
	if (!ascii && !hAnsi) return null;
	return {
		ascii: canonicalFontName(ascii || hAnsi || ""),
		hAnsi: canonicalFontName(hAnsi || ascii || ""),
	};
}

function buildRunFontsTag(font: { ascii: string; hAnsi: string }): string {
	const ascii = escapeXml(font.ascii);
	const hAnsi = escapeXml(font.hAnsi);
	return `<w:rFonts w:ascii="${ascii}" w:hAnsi="${hAnsi}" w:cs="${hAnsi}" w:eastAsia="${hAnsi}"/>`;
}

export function extractBodyFontFromDocument(xml: string): {
	ascii: string;
	hAnsi: string;
} {
	const sample = findSampleBodyParagraph(xml);
	if (sample) {
		const rFontsMatch = sample.match(/<w:rFonts[^/]*\/>/);
		if (rFontsMatch) {
			const parsed = parseRunFonts(rFontsMatch[0]);
			if (parsed && !PLACEHOLDER_FONT_PATTERN.test(parsed.ascii)) {
				return parsed;
			}
		}
	}

	const counts = new Map<string, number>();
	for (const match of xml.matchAll(/<w:rFonts[^/]*\/>/g)) {
		const parsed = parseRunFonts(match[0]);
		if (!parsed || PLACEHOLDER_FONT_PATTERN.test(parsed.ascii)) continue;
		const key = `${parsed.ascii}|${parsed.hAnsi}`;
		counts.set(key, (counts.get(key) || 0) + 1);
	}

	let best: { ascii: string; hAnsi: string } | null = null;
	let bestCount = 0;
	for (const [key, count] of counts) {
		if (count > bestCount) {
			const [ascii, hAnsi] = key.split("|");
			best = { ascii, hAnsi };
			bestCount = count;
		}
	}

	return best ?? DEFAULT_BODY_FONT;
}

/** Blueprint tokens often use Consolas; unify filled values with the document body font. */
export function normalizeBodyFonts(xml: string): string {
	const bodyFont = extractBodyFontFromDocument(xml);
	const rFontsTag = buildRunFontsTag(bodyFont);

	return xml.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, (run) => {
		let next = run.replace(/<w:rFonts[^/]*\/>/g, rFontsTag);
		next = next.replace(/<w:rStyle w:val="[^"]*"\s*\/>/g, "");
		if (/<w:rFonts[^/]*\/>/.test(next)) return next;
		if (/<w:rPr>/.test(next)) {
			return next.replace(/<w:rPr>/, `<w:rPr>${rFontsTag}`);
		}
		return next.replace(/(<w:r[^>]*>)/, `$1<w:rPr>${rFontsTag}</w:rPr>`);
	});
}

/** Strip token placeholder colors so merged values match body text (keep section heading blue). */
export function normalizeBodyColors(xml: string): string {
	return xml.replace(/<w:color w:val="([^"]+)"\s*\/>/gi, (match, color) => {
		if (String(color).toUpperCase() === "0F5384") return match;
		return "";
	});
}

/** Remove any merge tokens still visible after preview merge. */
export function stripRemainingMergeTokens(xml: string): string {
	return xml.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
}

function postProcessDocumentXml(xml: string, forPreview: boolean): string {
	let next = stripEmptyListParagraphs(xml);
	next = normalizeBodyFonts(next);
	if (forPreview) {
		next = stripRemainingMergeTokens(next);
		next = normalizeBodyColors(next);
	}
	return next;
}

/** Remove list paragraphs that have no visible text after token merge. */
export function stripEmptyListParagraphs(xml: string): string {
	return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
		if (!isListParagraph(paragraph)) return paragraph;
		return paragraphPlainText(paragraph) ? paragraph : "";
	});
}

/** Highest `N.` section heading already in the blueprint (e.g. 9 from "9. DISPUTES"). */
export function maxNumberedHeading(xml: string): number {
	let max = 0;
	const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
	for (const paragraph of paragraphs) {
		const plain = paragraphPlainText(paragraph);
		const match = plain.match(/^(\d+)\.\s+\S/);
		if (match) max = Math.max(max, Number(match[1]));
	}
	return max;
}

/** Index of the paragraph that starts the signatures block, if present. */
export function findSignaturesParagraphIndex(xml: string): number | null {
	const re = /<w:p[\s\S]*?<\/w:p>/g;
	let match: RegExpExecArray | null = re.exec(xml);
	while (match) {
		const plain = paragraphPlainText(match[0]);
		if (/DIGITAL\s+SIGNATURES/i.test(plain)) return match.index;
		match = re.exec(xml);
	}
	return null;
}

/** Empty bordered paragraphs the blueprint uses as horizontal rules before signatures. */
export function isHorizontalRuleParagraph(paragraphXml: string): boolean {
	if (paragraphPlainText(paragraphXml)) return false;
	return /<w:pBdr[\s>]/.test(paragraphXml);
}

/** Insert before signature rules so clauses sit directly after the last section body. */
export function findSupplementalInsertIndex(xml: string): number | null {
	const signatureIdx = findSignaturesParagraphIndex(xml);
	if (signatureIdx == null) return null;

	let insertAt = signatureIdx;
	const before = xml.slice(0, signatureIdx);
	const paragraphRe = /<w:p[\s\S]*?<\/w:p>/g;
	let match: RegExpExecArray | null = paragraphRe.exec(before);
	const paragraphs: Array<{ start: number; xml: string }> = [];
	while (match) {
		paragraphs.push({ start: match.index ?? 0, xml: match[0] });
		match = paragraphRe.exec(before);
	}

	for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
		if (isHorizontalRuleParagraph(paragraphs[index].xml)) {
			insertAt = paragraphs[index].start;
			continue;
		}
		break;
	}

	return insertAt;
}

export function buildAdditionalTermsBlocks(
	paragraphs: string[],
	nextNumber: number,
	sourceXml?: string,
): string {
	return buildSupplementalDocumentBlocks({
		customBlockBodies: paragraphs,
		sourceXml,
		startNumber: nextNumber,
	});
}

function insertBlocksIntoDocument(xml: string, blocks: string): string {
	if (!blocks) return xml;

	const insertAt = findSupplementalInsertIndex(xml);
	if (insertAt != null) {
		return xml.slice(0, insertAt) + blocks + xml.slice(insertAt);
	}

	const sectPr = xml.lastIndexOf("<w:sectPr");
	if (sectPr >= 0) {
		return xml.slice(0, sectPr) + blocks + xml.slice(sectPr);
	}

	if (!xml.includes("</w:body>")) {
		throw new Error("Blueprint document is missing a body section");
	}
	return xml.replace("</w:body>", `${blocks}</w:body>`);
}

export function appendSupplementalSectionsToDocx(
	docx: Buffer,
	input: {
		injectedClauses?: InjectedClause[];
		customBlockBodies?: string[];
	},
): Buffer {
	const clauses = (input.injectedClauses || []).filter(
		(clause) => clause.title.trim() || clause.body.trim(),
	);
	const customBodies = (input.customBlockBodies || [])
		.map((row) => row.trim())
		.filter(Boolean);
	if (clauses.length === 0 && customBodies.length === 0) return docx;

	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) throw new Error("Document XML is missing from the blueprint");
	const xml = file.asText();
	const startNumber = maxNumberedHeading(xml) + 1;
	const blocks = buildSupplementalDocumentBlocks({
		injectedClauses: clauses,
		customBlockBodies: customBodies,
		sourceXml: xml,
		startNumber,
	});
	zip.file("word/document.xml", insertBlocksIntoDocument(xml, blocks));
	return zip.generate({ type: "nodebuffer" });
}

export function appendParagraphsToDocx(
	docx: Buffer,
	paragraphs: string[],
): Buffer {
	return appendSupplementalSectionsToDocx(docx, {
		customBlockBodies: paragraphs,
	});
}

export function mergeDocxTemplate(
	template: Buffer,
	tokenValues: Record<string, string>,
	opts?: { keepMissing?: boolean; forPreview?: boolean },
): Buffer {
	const zip = new PizZip(template);
	const doc = new Docxtemplater(zip, {
		paragraphLoop: true,
		linebreaks: true,
		delimiters: { start: "{{", end: "}}" },
		nullGetter: (part) => {
			const key = String(part.value || "");
			if (opts?.forPreview) return "";
			if (isSignatureLockToken(key)) return `{{${key}}}`;
			if (opts?.keepMissing) return `{{${key}}}`;
			return "";
		},
	});

	const data: Record<string, string> = {};
	for (const [key, value] of Object.entries(tokenValues)) {
		if (isSignatureLockToken(key)) continue;
		data[key] = value;
	}

	doc.render(data);
	const rendered = doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
	const renderedZip = new PizZip(rendered);
	const file = renderedZip.file("word/document.xml");
	if (!file) return rendered;
	renderedZip.file(
		"word/document.xml",
		postProcessDocumentXml(file.asText(), Boolean(opts?.forPreview)),
	);
	return renderedZip.generate({ type: "nodebuffer" });
}

function replaceSignatureSection(
	xml: string,
	blueprintId: string,
	tokenValues: Record<string, string>,
	forPreview: boolean,
): string {
	const parties = signaturePartiesForBlueprint(blueprintId);
	const start = findSignaturesParagraphIndex(xml);
	if (start == null || parties.length === 0) return xml;

	const sectPr = xml.indexOf("<w:sectPr", start);
	const end = sectPr >= 0 ? sectPr : xml.indexOf("</w:body>");
	if (end < 0) return xml;

	const block = buildSignatureSectionXml(parties, tokenValues, forPreview);
	return `${xml.slice(0, start)}${block}${xml.slice(end)}`;
}

function applySignatureSectionRevamp(
	docx: Buffer,
	input: {
		blueprintId: string;
		tokenValues: Record<string, string>;
		forPreview?: boolean;
	},
): Buffer {
	const parties = signaturePartiesForBlueprint(input.blueprintId);
	if (parties.length === 0) return docx;

	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) return docx;
	const xml = replaceSignatureSection(
		file.asText(),
		input.blueprintId,
		input.tokenValues,
		Boolean(input.forPreview),
	);
	zip.file("word/document.xml", xml);
	return zip.generate({ type: "nodebuffer" });
}

export function mergeBlueprintDocument(input: {
	template: Buffer;
	tokenValues: Record<string, string>;
	customBlocks?: WizardCustomBlock[];
	injectedClauses?: InjectedClause[];
	forPreview?: boolean;
	blueprintId?: string;
}): Buffer {
	const merged = mergeDocxTemplate(input.template, input.tokenValues, {
		forPreview: input.forPreview,
	});
	const withSupplemental = appendSupplementalSectionsToDocx(merged, {
		injectedClauses: input.injectedClauses,
		customBlockBodies: (input.customBlocks || []).map((block) => block.body),
	});
	if (!input.blueprintId) return withSupplemental;
	return applySignatureSectionRevamp(withSupplemental, {
		blueprintId: input.blueprintId,
		tokenValues: input.tokenValues,
		forPreview: input.forPreview,
	});
}
