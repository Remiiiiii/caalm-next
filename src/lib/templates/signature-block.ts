import { isSignatureLockToken, tokensForBlueprint } from "./token-schema";

export type SignatureParty = {
	prefix: string;
	heading: string;
	shortLabel: string;
	signeeToken: string;
	titleToken: string;
	hashToken: string;
	timestampToken: string;
};

const TEAL = "0F5384";
const LABEL_GRAY = "64748B";
const RULE_GRAY = "CBD5E1";
const MINT_FILL = "E8F5F0";
const MONO = "Consolas";
const BODY = "Times New Roman";

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function partyHeading(prefix: string): string {
	return prefix.replace(/_/g, " ");
}

function partyShortLabel(prefix: string): string {
	if (prefix.includes("GOVERNMENT") || prefix.includes("AGENCY")) return "Agency";
	if (prefix === "CONTRACTOR") return "Contractor";
	if (prefix.includes("CLIENT")) return "Client";
	if (prefix.includes("VENDOR")) return "Vendor";
	if (prefix.includes("GRANTOR")) return "Grantor";
	if (prefix.includes("GRANTEE")) return "Grantee";
	if (prefix.includes("LANDLORD")) return "Landlord";
	if (prefix.includes("TENANT")) return "Tenant";
	if (prefix.includes("CONSULTANT")) return "Consultant";
	if (prefix.includes("DONOR")) return "Donor";
	if (prefix.includes("RECIPIENT")) return "Recipient";
	if (prefix.includes("COMPANY")) return "Company";
	if (prefix.includes("EMPLOYEE")) return "Employee";
	if (prefix.includes("FISCAL_SPONSOR")) return "Fiscal sponsor";
	if (prefix.includes("SPONSORED_PROJECT")) return "Sponsored project";
	if (prefix.startsWith("PARTY_A")) return "Party A";
	if (prefix.startsWith("PARTY_B")) return "Party B";
	const parts = prefix.split("_");
	const last = parts[parts.length - 1] || prefix;
	return last.charAt(0) + last.slice(1).toLowerCase();
}

export function signaturePartiesForBlueprint(blueprintId: string): SignatureParty[] {
	return tokensForBlueprint(blueprintId)
		.filter((token) => token.endsWith("_SIGNEE_NAME"))
		.map((signeeToken) => {
			const prefix = signeeToken.replace(/_SIGNEE_NAME$/, "");
			return {
				prefix,
				heading: partyHeading(prefix),
				shortLabel: partyShortLabel(prefix),
				signeeToken,
				titleToken: `${prefix}_SIGNEE_TITLE`,
				hashToken: `${prefix}_SIGNATURE_HASH`,
				timestampToken: `${prefix}_SIGNATURE_TIMESTAMP`,
			};
		});
}

function displayLockValue(
	token: string,
	tokenValues: Record<string, string>,
	forPreview: boolean,
): string {
	const value = String(tokenValues[token] || "").trim();
	if (value) return value;
	if (forPreview || isSignatureLockToken(token)) return "–";
	return "–";
}

function run(
	text: string,
	opts?: {
		bold?: boolean;
		color?: string;
		font?: string;
		size?: number;
		caps?: boolean;
	},
): string {
	const rPr: string[] = [];
	if (opts?.font) {
		rPr.push(
			`<w:rFonts w:ascii="${opts.font}" w:hAnsi="${opts.font}" w:cs="${opts.font}" w:eastAsia="${opts.font}"/>`,
		);
	}
	if (opts?.bold) rPr.push("<w:b/>");
	if (opts?.color) rPr.push(`<w:color w:val="${opts.color}"/>`);
	if (opts?.size) {
		rPr.push(`<w:sz w:val="${opts.size}"/>`);
		rPr.push(`<w:szCs w:val="${opts.size}"/>`);
	}
	if (opts?.caps) rPr.push("<w:caps/>");
	const rPrXml = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
	return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraph(content: string, pPr = ""): string {
	return `<w:p>${pPr}${content}</w:p>`;
}

function partyHeaderParagraph(heading: string): string {
	return paragraph(
		run(heading, { bold: true, color: TEAL, font: BODY, size: 20, caps: true }),
		`<w:pPr><w:spacing w:after="120"/></w:pPr>`,
	);
}

function signatureLineParagraph(): string {
	return paragraph(
		run("", { font: BODY, size: 20 }),
		`<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${TEAL}"/></w:pBdr><w:spacing w:after="40"/></w:pPr>`,
	);
}

function fieldLabelParagraph(label: string): string {
	return paragraph(
		run(label, { color: LABEL_GRAY, font: BODY, size: 16, caps: true }),
		`<w:pPr><w:spacing w:after="160"/></w:pPr>`,
	);
}

function buildManualPartyCell(party: SignatureParty): string {
	const fields = [
		"SIGNATURE",
		"AUTHORIZED SIGNEE (PRINTED NAME)",
		"TITLE",
		"DATE",
	];
	const body = [
		partyHeaderParagraph(party.heading),
		...fields.flatMap((label) => [signatureLineParagraph(), fieldLabelParagraph(label)]),
	].join("");
	return `<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>${body}</w:tc>`;
}

function tableRow(cells: string[]): string {
	return `<w:tr>${cells.join("")}</w:tr>`;
}

function twoColumnTable(rows: string[]): string {
	return [
		"<w:tbl>",
		`<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>`,
		`<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>`,
		`<w:insideH w:val="nil"/><w:insideV w:val="nil"/>`,
		`</w:tblBorders><w:tblLook w:val="04A0"/></w:tblPr>`,
		`<w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>`,
		...rows,
		"</w:tbl>",
	].join("");
}

function sectionDividerParagraph(): string {
	return paragraph(
		"",
		`<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${RULE_GRAY}"/></w:pBdr><w:spacing w:before="240" w:after="240"/></w:pPr>`,
	);
}

function digitalRecordHeaderParagraph(): string {
	return paragraph(
		run("DIGITAL SIGNATURE RECORD – POPULATED ON EXECUTION", {
			bold: true,
			font: MONO,
			size: 18,
			caps: true,
		}),
		`<w:pPr><w:spacing w:before="120" w:after="160"/></w:pPr>`,
	);
}

function digitalCell(
	label: string,
	value: string,
	dottedBottom: boolean,
): string {
	const border = dottedBottom
		? `<w:tcBorders><w:bottom w:val="dotted" w:sz="4" w:space="0" w:color="${RULE_GRAY}"/></w:tcBorders>`
		: "";
	return [
		`<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/>${border}</w:tcPr>`,
		paragraph(
			run(label, { font: MONO, size: 18 }),
			`<w:pPr><w:spacing w:after="40"/></w:pPr>`,
		),
		paragraph(
			run(value, { font: MONO, size: 18 }),
			`<w:pPr><w:spacing w:after="120"/></w:pPr>`,
		),
		"</w:tc>",
	].join("");
}

function buildDigitalRecordTable(
	parties: SignatureParty[],
	tokenValues: Record<string, string>,
	forPreview: boolean,
): string {
	const hashRow = tableRow(
		parties.map((party, index) =>
			digitalCell(
				`Fingerprint hash (${party.shortLabel})`,
				displayLockValue(party.hashToken, tokenValues, forPreview),
				true,
			),
		),
	);
	const timestampRow = tableRow(
		parties.map((party) =>
			digitalCell(
				`Timestamp (${party.shortLabel})`,
				displayLockValue(party.timestampToken, tokenValues, forPreview),
				true,
			),
		),
	);
	return twoColumnTable([hashRow, timestampRow]);
}

function verificationBannerParagraph(): string {
	return paragraph(
		run("ELECTRONICALLY SIGNED VIA CAALM SECURE SIGNATURE MODULE", {
			bold: true,
			color: TEAL,
			font: BODY,
			size: 18,
			caps: true,
		}),
		[
			`<w:pPr>`,
			`<w:shd w:val="clear" w:color="auto" w:fill="${MINT_FILL}"/>`,
			`<w:pBdr>`,
			`<w:top w:val="single" w:sz="4" w:space="4" w:color="${RULE_GRAY}"/>`,
			`<w:left w:val="single" w:sz="4" w:space="4" w:color="${RULE_GRAY}"/>`,
			`<w:bottom w:val="single" w:sz="4" w:space="4" w:color="${RULE_GRAY}"/>`,
			`<w:right w:val="single" w:sz="4" w:space="4" w:color="${RULE_GRAY}"/>`,
			`</w:pBdr>`,
			`<w:spacing w:before="280" w:after="280"/>`,
			`<w:jc w:val="center"/>`,
			`</w:pPr>`,
		].join(""),
	);
}

export function buildSignatureSectionXml(
	parties: SignatureParty[],
	tokenValues: Record<string, string>,
	forPreview: boolean,
): string {
	if (parties.length === 0) return "";

	const manualCells = parties.map((party) => buildManualPartyCell(party));
	while (manualCells.length < 2) {
		manualCells.push(`<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr></w:tc>`);
	}

	return [
		twoColumnTable([tableRow(manualCells.slice(0, 2))]),
		sectionDividerParagraph(),
		digitalRecordHeaderParagraph(),
		buildDigitalRecordTable(parties, tokenValues, forPreview),
		verificationBannerParagraph(),
	].join("");
}