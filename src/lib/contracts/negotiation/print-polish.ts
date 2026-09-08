import PizZip from "pizzip";

const ISO_DATE = /\d{4}-\d{2}-\d{2}/;
const EFFECTIVE_DATE_LINE =
	/(?:^|\n)\s*Effective\s+Date\s*:\s*(\d{4}-\d{2}-\d{2})/i;
const TERM_FROM_THROUGH =
	/\bfrom\s+(\d{4}-\d{2}-\d{2})\s+through\s+(\d{4}-\d{2}-\d{2})\b/gi;
const REDUNDANT_PARTY_LINE = /^(Grantor|Grantee)\s*:\s*.+$/i;

function paragraphPlainText(paragraphXml: string): string {
	const texts = [...paragraphXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(
		(match) =>
			match[1]
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'"),
	);
	return texts.join("").replace(/\s+/g, " ").trim();
}

/** Pull the Effective Date called out in the body (redlines land here). */
export function extractEffectiveDate(text: string): string | null {
	const match = EFFECTIVE_DATE_LINE.exec(text);
	return match?.[1] || null;
}

/**
 * Keep Term start aligned with Effective Date so print does not show two
 * different "start" dates on the same page.
 */
export function alignTermStartWithEffectiveDate(text: string): string {
	const effective = extractEffectiveDate(text);
	if (!effective || !ISO_DATE.test(effective)) return text;
	return text.replace(TERM_FROM_THROUGH, (_full, _start, end: string) => {
		return `from ${effective} through ${end}`;
	});
}

/**
 * Drop standalone Grantor:/Grantee: lines when the intro already names those
 * parties (avoids repeating the same names under the opening paragraph).
 */
export function stripRedundantPartyLines(text: string): string {
	const hasNamedGrantor = /\(\s*["']?Grantor["']?\s*\)/i.test(text);
	const hasNamedGrantee = /\(\s*["']?Grantee["']?\s*\)/i.test(text);
	if (!hasNamedGrantor && !hasNamedGrantee) return text;

	return text
		.split("\n")
		.filter((line) => {
			const trimmed = line.trim();
			if (!REDUNDANT_PARTY_LINE.test(trimmed)) return true;
			if (/^Grantor\s*:/i.test(trimmed) && hasNamedGrantor) return false;
			if (/^Grantee\s*:/i.test(trimmed) && hasNamedGrantee) return false;
			return true;
		})
		.join("\n")
		.replace(/\n{3,}/g, "\n\n");
}

/** Plain-text polish used on snapshots and HTML-derived text. */
export function polishNegotiationPlainText(text: string): string {
	return stripRedundantPartyLines(alignTermStartWithEffectiveDate(text));
}

/**
 * Same polish on the Word draft before PDF/HTML preview so print matches the
 * cleaned letterheaded document.
 */
export function polishNegotiationDocx(docx: Buffer): Buffer {
	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) return docx;

	let xml = file.asText();
	const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map(
		(match) => ({
			xml: match[0],
			index: match.index ?? 0,
			text: paragraphPlainText(match[0]),
		}),
	);
	const fullPlain = paragraphs.map((row) => row.text).join("\n");
	const effective = extractEffectiveDate(fullPlain);
	const hasNamedGrantor = /\(\s*["']?Grantor["']?\s*\)/i.test(fullPlain);
	const hasNamedGrantee = /\(\s*["']?Grantee["']?\s*\)/i.test(fullPlain);

	const dropIndexes = new Set<number>();
	paragraphs.forEach((row, index) => {
		if (!REDUNDANT_PARTY_LINE.test(row.text)) return;
		if (/^Grantor\s*:/i.test(row.text) && hasNamedGrantor) {
			dropIndexes.add(index);
		}
		if (/^Grantee\s*:/i.test(row.text) && hasNamedGrantee) {
			dropIndexes.add(index);
		}
	});

	if (dropIndexes.size > 0) {
		const ordered = [...dropIndexes].sort((a, b) => b - a);
		for (const index of ordered) {
			const row = paragraphs[index];
			xml = xml.slice(0, row.index) + xml.slice(row.index + row.xml.length);
		}
	}

	if (effective && ISO_DATE.test(effective)) {
		// Re-scan after party-line deletes so indexes stay valid.
		const termParas = [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map(
			(match) => ({
				xml: match[0],
				index: match.index ?? 0,
				text: paragraphPlainText(match[0]),
			}),
		);
		let inTerm = false;
		const termUpdates: Array<{ index: number; length: number; value: string }> =
			[];
		for (const row of termParas) {
			if (/^\d+[.)]\s*TERM\b/i.test(row.text)) {
				inTerm = true;
				continue;
			}
			if (inTerm && /^\d+[.)]\s+\S/.test(row.text)) {
				inTerm = false;
			}
			if (!inTerm) continue;
			const range = /\bfrom\s+(\d{4}-\d{2}-\d{2})\s+through\s+(\d{4}-\d{2}-\d{2})\b/i.exec(
				row.text,
			);
			if (!range || range[1] === effective) continue;
			const oldStart = range[1];
			// Prefer whole-run replace (Word often splits "from ", date, " through ").
			let nextPara = row.xml.replace(
				new RegExp(`(<w:t[^>]*>)${oldStart}(</w:t>)`),
				`$1${effective}$2`,
			);
			if (nextPara === row.xml) {
				nextPara = row.xml.replace(
					new RegExp(
						`from\\s+${oldStart}\\s+through\\s+${range[2]}`,
						"i",
					),
					`from ${effective} through ${range[2]}`,
				);
			}
			if (nextPara !== row.xml) {
				termUpdates.push({
					index: row.index,
					length: row.xml.length,
					value: nextPara,
				});
			}
		}
		for (const update of termUpdates.sort((a, b) => b.index - a.index)) {
			xml =
				xml.slice(0, update.index) +
				update.value +
				xml.slice(update.index + update.length);
		}
	}

	zip.file("word/document.xml", xml);
	return zip.generate({ type: "nodebuffer" }) as Buffer;
}

/** Clean Mammoth HTML the same way (preview/print fallback). */
export function polishNegotiationHtml(html: string): string {
	let next = html;
	const text = next.replace(/<[^>]+>/g, "\n");
	const effective = extractEffectiveDate(text);
	if (effective) {
		next = next.replace(TERM_FROM_THROUGH, (_full, _start, end: string) => {
			return `from ${effective} through ${end}`;
		});
	}

	const hasNamedGrantor = /\(\s*["']?Grantor["']?\s*\)/i.test(text);
	const hasNamedGrantee = /\(\s*["']?Grantee["']?\s*\)/i.test(text);
	if (hasNamedGrantor || hasNamedGrantee) {
		next = next.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (paragraph) => {
			const plain = paragraph.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
			if (/^Grantor\s*:/i.test(plain) && hasNamedGrantor) return "";
			if (/^Grantee\s*:/i.test(plain) && hasNamedGrantee) return "";
			return paragraph;
		});
	}
	return next;
}
