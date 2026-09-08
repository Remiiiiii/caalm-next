import PizZip from "pizzip";

function decodeXmlText(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
}

function encodeXmlText(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function normalizeSearchText(value: string): string {
	return (
		value
			.replace(/\r\n/g, "\n")
			.replace(/\u00a0/g, " ")
			// Snapshot uses **bold** markers; DOCX stores plain runs without asterisks.
			.replace(/\*\*/g, "")
			.replace(/\s+/g, " ")
			.trim()
	);
}

type TextRun = {
	/** Absolute start offset in the concatenated plain text. */
	plainStart: number;
	text: string;
	/** Full `<w:t…>…</w:t>` match including tags. */
	fullMatch: string;
	innerStart: number;
	innerEnd: number;
};

/**
 * Replace `searchText` with `replacement` inside word/document.xml by editing
 * `<w:t>` runs in place. Preserves surrounding OOXML structure.
 */
export function applyPlainTextReplacementInDocx(
	docx: Buffer,
	searchText: string,
	replacement: string,
): Buffer {
	const needle = normalizeSearchText(searchText);
	if (!needle) {
		throw new Error("Redline selection is empty");
	}

	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) {
		throw new Error("Document XML is missing from the negotiation DOCX");
	}
	const xml = file.asText();
	const runs: TextRun[] = [];
	let plain = "";
	const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
	let match: RegExpExecArray | null = re.exec(xml);
	while (match) {
		const inner = match[1];
		const text = decodeXmlText(inner);
		runs.push({
			plainStart: plain.length,
			text,
			fullMatch: match[0],
			innerStart: match.index + match[0].indexOf(inner),
			innerEnd: match.index + match[0].indexOf(inner) + inner.length,
		});
		plain += text;
		match = re.exec(xml);
	}

	const plainNormalized = plain.replace(/\u00a0/g, " ");
	// Prefer exact match; fall back to whitespace-collapsed search with mapping.
	let start = plainNormalized.indexOf(needle);
	let end = start >= 0 ? start + needle.length : -1;

	if (start < 0) {
		const collapsedPlain = plainNormalized.replace(/\s+/g, " ");
		const collapsedNeedle = needle;
		const collapsedStart = collapsedPlain.indexOf(collapsedNeedle);
		if (collapsedStart < 0) {
			throw new Error(
				"Could not find the selected text inside the negotiation DOCX",
			);
		}
		// Map collapsed offsets back by walking original plain.
		start = mapCollapsedOffset(plainNormalized, collapsedStart);
		end = mapCollapsedOffset(
			plainNormalized,
			collapsedStart + collapsedNeedle.length,
		);
	}

	const affected = runs.filter((run) => {
		const runEnd = run.plainStart + run.text.length;
		return run.plainStart < end && runEnd > start;
	});
	if (affected.length === 0) {
		throw new Error("Could not map redline text onto DOCX runs");
	}

	let nextXml = xml;
	// Edit from the end so earlier offsets stay valid.
	for (let i = affected.length - 1; i >= 0; i -= 1) {
		const run = affected[i];
		const runEnd = run.plainStart + run.text.length;
		const localStart = Math.max(0, start - run.plainStart);
		const localEnd = Math.min(run.text.length, end - run.plainStart);
		let nextText = run.text;
		if (i === 0) {
			nextText =
				run.text.slice(0, localStart) + replacement + run.text.slice(localEnd);
		} else {
			nextText = run.text.slice(0, localStart) + run.text.slice(localEnd);
		}
		nextXml =
			nextXml.slice(0, run.innerStart) +
			encodeXmlText(nextText) +
			nextXml.slice(run.innerEnd);
	}

	zip.file("word/document.xml", nextXml);
	return zip.generate({ type: "nodebuffer" }) as Buffer;
}

/** Map an offset in whitespace-collapsed text back into the original string. */
function mapCollapsedOffset(original: string, collapsedOffset: number): number {
	let collapsed = 0;
	let i = 0;
	while (i < original.length && collapsed < collapsedOffset) {
		const isSpace = /\s/.test(original[i]);
		if (isSpace) {
			collapsed += 1;
			while (i < original.length && /\s/.test(original[i])) i += 1;
			continue;
		}
		collapsed += 1;
		i += 1;
	}
	return i;
}

/**
 * Apply a negotiation redline (anchor span → proposal) onto a DOCX buffer.
 */
export function applyRedlineToDocx(
	docx: Buffer,
	extractedText: string,
	comment: {
		anchorStart: number;
		anchorEnd: number;
		redlineProposal: string;
	},
): Buffer {
	const start = Math.max(0, comment.anchorStart);
	const end = Math.min(
		extractedText.length,
		Math.max(start, comment.anchorEnd),
	);
	const searchText = extractedText.slice(start, end);
	const proposal = comment.redlineProposal.trim();
	if (!proposal) {
		throw new Error("Redline proposal is empty");
	}
	return applyPlainTextReplacementInDocx(docx, searchText, proposal);
}
