import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { WizardCustomBlock } from "@/types/contract-templates";
import { isSignatureLockToken } from "./token-schema";

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function appendParagraphsToDocx(
	docx: Buffer,
	paragraphs: string[],
): Buffer {
	const extras = paragraphs.map((row) => row.trim()).filter(Boolean);
	if (extras.length === 0) return docx;

	const zip = new PizZip(docx);
	const file = zip.file("word/document.xml");
	if (!file) throw new Error("Document XML is missing from the blueprint");
	const xml = file.asText();
	const blocks = [
		`<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Additional terms</w:t></w:r></w:p>`,
		...extras.map(
			(text) =>
				`<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
		),
	].join("");
	if (!xml.includes("</w:body>")) {
		throw new Error("Blueprint document is missing a body section");
	}
	zip.file("word/document.xml", xml.replace("</w:body>", `${blocks}</w:body>`));
	return zip.generate({ type: "nodebuffer" });
}

export function mergeDocxTemplate(
	template: Buffer,
	tokenValues: Record<string, string>,
	opts?: { keepMissing?: boolean },
): Buffer {
	const zip = new PizZip(template);
	const doc = new Docxtemplater(zip, {
		paragraphLoop: true,
		linebreaks: true,
		delimiters: { start: "{{", end: "}}" },
		nullGetter: (part) => {
			const key = String(part.value || "");
			if (isSignatureLockToken(key) || opts?.keepMissing) return `{{${key}}}`;
			return "";
		},
	});

	const data: Record<string, string> = {};
	for (const [key, value] of Object.entries(tokenValues)) {
		if (isSignatureLockToken(key)) continue;
		data[key] = value;
	}

	doc.render(data);
	return doc.getZip().generate({ type: "nodebuffer" });
}

export function mergeBlueprintDocument(input: {
	template: Buffer;
	tokenValues: Record<string, string>;
	customBlocks?: WizardCustomBlock[];
	injectedBodies?: string[];
}): Buffer {
	const merged = mergeDocxTemplate(input.template, input.tokenValues);
	const extras = [
		...(input.customBlocks || []).map((block) => block.body),
		...(input.injectedBodies || []),
	];
	return appendParagraphsToDocx(merged, extras);
}
