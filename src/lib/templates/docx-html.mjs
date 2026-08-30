import mammoth from "mammoth";
import PizZip from "pizzip";

const EMU_PER_INCH = 914400;
const CSS_PX_PER_INCH = 96;

export const DOCX_PREVIEW_CSS = `
.docx-preview {
  color: #111;
  font-family: "Times New Roman", Times, serif;
  font-size: 15px;
  line-height: 1.45;
}
.docx-letterhead {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin: 0 0 1.5rem;
  width: 100%;
}
.docx-letterhead-logo {
  flex: 0 0 auto;
}
.docx-letterhead img {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}
.docx-letterhead-org {
  flex: 0 1 auto;
  margin-left: auto;
  max-width: 55%;
  color: #111;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.05;
  text-align: right;
}
.docx-letterhead-org p {
  margin: 0;
  line-height: 1.05;
  text-align: right;
}
.docx-letterhead-org p + p {
  margin-top: 0;
}
.docx-letterhead-org p:first-child {
  font-weight: 700;
}
.docx-title {
  color: #0f5384;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin: 0 0 1rem;
  text-align: center;
}
.docx-title strong { color: inherit; font-weight: 700; }
.docx-heading { color: #0f5384; font-weight: 700; margin: 1rem 0 0.5rem; }
.docx-heading strong { color: inherit; }
.docx-token { color: #8a2a00; }
.docx-rule {
  border: 0;
  border-top: 1px solid #111;
  margin: 1rem 0 1.25rem;
}
.docx-preview p { margin: 0 0 0.75rem; }
.docx-preview .docx-letterhead-org p { margin: 0; line-height: 1.05; }
.docx-preview ul { margin: 0 0 0.75rem; padding-left: 1.25rem; }
`;

export function extractImageExtents(docx) {
	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) return [];
	const xml = file.asText();
	return [...xml.matchAll(/wp:extent[^>]*cx="(\d+)"[^>]*cy="(\d+)"/g)].map(
		(match) => ({
			width: Math.max(
				1,
				Math.round((Number(match[1]) / EMU_PER_INCH) * CSS_PX_PER_INCH),
			),
			height: Math.max(
				1,
				Math.round((Number(match[2]) / EMU_PER_INCH) * CSS_PX_PER_INCH),
			),
		}),
	);
}

export function isLetterheadOrgPart(part) {
	if (!/^<p[\s\S]*<\/p>$/i.test(part) || /<img\b/i.test(part)) return false;
	if (/\{\{\s*org_|<span class="docx-token">\{\{org_/.test(part)) return true;
	if (/<strong>[^<]*[A-Z]{4,}[^<]*<\/strong>/.test(part)) return false;
	if (/<strong>\s*\d+\./.test(part)) return false;
	const textOnly = part
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!textOnly) return false;
	// Mammoth often merges letterhead lines into one <p> with <br> tags.
	const brCount = (part.match(/<br\s*\/?>/gi) || []).length;
	if (brCount >= 2 && textOnly.length <= 500) return true;
	if (
		brCount >= 1 &&
		textOnly.length <= 500 &&
		(/@|https?:\/\//.test(textOnly) || /\(\d{3}\)/.test(textOnly))
	) {
		return true;
	}
	return textOnly.length > 0 && textOnly.length <= 200;
}

function normalizeLetterheadOrgParts(parts) {
	return parts.flatMap((part) => {
		if (!/^<p[\s\S]*<\/p>$/i.test(part)) return [part];
		const inner = part.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "");
		const splitOn = /<br\s*\/?>/i.test(inner)
			? inner.split(/<br\s*\/?>/i)
			: inner.includes("\n")
				? inner.split(/\n+/)
				: null;
		if (!splitOn) return [part];
		const lines = splitOn.map((line) => line.trim()).filter(Boolean);
		if (lines.length <= 1) return [part];
		return lines.map((line) => `<p>${line}</p>`);
	});
}

export function layoutDocxHtml(html) {
	let next = html.replace(/<p>\s*<\/p>/g, "");
	next = next.replace(
		/\{\{[A-Za-z0-9_]+\}\}/g,
		'<span class="docx-token">$&</span>',
	);

	const parts = next.split(/(<p[\s\S]*?<\/p>)/).filter(Boolean);
	const imgIdx = parts.findIndex((part) => /<img\b/i.test(part));
	if (imgIdx >= 0) {
		const imgPart = parts[imgIdx];
		const imgTag = imgPart.match(/<img\b[^>]*>/i)?.[0] || "";
		const orgFromSame = imgPart
			.replace(/<img\b[^>]*>/i, "")
			.replace(/^<p[^>]*>|<\/p>$/g, "")
			.trim();
		const orgParts = [];
		if (
			orgFromSame &&
			(/\{\{\s*org_|<span class="docx-token">\{\{org_/.test(orgFromSame) ||
				/<br\s*\/?>/i.test(orgFromSame))
		) {
			orgParts.push(`<p>${orgFromSame}</p>`);
		}
		let end = imgIdx + 1;
		while (end < parts.length && end - imgIdx <= 6) {
			const part = parts[end];
			if (!isLetterheadOrgPart(part)) break;
			orgParts.push(part);
			end += 1;
		}
		const orgHtml = normalizeLetterheadOrgParts(orgParts).join("");
		parts.splice(
			imgIdx,
			end - imgIdx,
			`<div class="docx-letterhead"><div class="docx-letterhead-logo">${imgTag}</div><div class="docx-letterhead-org">${orgHtml}</div></div>`,
		);
		next = parts.join("");
	}

	next = next.replace(
		/<p>(<strong>[^<]*[A-Z]{4,}[^<]*<\/strong>)<\/p>/,
		'<p class="docx-title">$1</p>',
	);
	next = next.replace(
		/<p>(<strong>\s*\d+\.[\s\S]*?<\/strong>)<\/p>/g,
		'<p class="docx-heading">$1</p>',
	);
	next = next.replace(
		/(<p class="docx-heading"><strong>\s*1\.)/,
		'<hr class="docx-rule" />$1',
	);
	return next;
}

export async function docxBufferToHtml(docx, opts) {
	const scale = opts?.imageScale && opts.imageScale > 0 ? opts.imageScale : 1;
	const extents = extractImageExtents(docx);
	let imageIndex = 0;

	const result = await mammoth.convertToHtml(
		{ buffer: docx },
		{
			convertImage: mammoth.images.imgElement(async (image) => {
				const extent = extents[imageIndex] || { width: 67, height: 64 };
				imageIndex += 1;
				const width = Math.round(extent.width * scale);
				const height = Math.round(extent.height * scale);
				const bytes = await image.read("base64");
				return {
					src: `data:${image.contentType};base64,${bytes}`,
					width: String(width),
					height: String(height),
					style: `width:${width}px;height:${height}px`,
				};
			}),
		},
	);

	return layoutDocxHtml(result.value || "<p></p>");
}
