const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL =
	"http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

// Navy #162768 header/title, grey #6B7280 secondary, green pill for counted,
// grey pill for duplicates, tinted total band. Indexes match cellXfs order.
const STYLES = `${XML}<styleSheet xmlns="${NS}"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0;\\(&quot;$&quot;#,##0\\);&quot;–&quot;"/><numFmt numFmtId="165" formatCode="mmm\\ d\\,\\ yyyy"/></numFmts><fonts count="7"><font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF162768"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FF162768"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FF166534"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF162768"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F4F9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3F4E8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF0F3"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD9DDE5"/></bottom><diagonal/></border><border><left/><right/><top style="medium"><color rgb="FF162768"/></top><bottom style="thin"><color rgb="FF162768"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="15"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="2" applyFont="1" xfId="0"><alignment vertical="center"/></xf><xf fontId="3" applyFont="1" xfId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center" indent="1"/></xf><xf fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1" xfId="0"><alignment horizontal="right" vertical="center" indent="1"/></xf><xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment vertical="center" wrapText="1" indent="1"/></xf><xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center" indent="1"/></xf><xf numFmtId="164" fontId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="right" vertical="center" indent="1"/></xf><xf fontId="5" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf fontId="6" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf fontId="4" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment vertical="center" indent="1"/></xf><xf numFmtId="164" fontId="4" fillId="3" borderId="2" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="right" vertical="center" indent="1"/></xf><xf fontId="4" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="165" fontId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center" indent="1"/></xf><xf numFmtId="3" fontId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1" xfId="0"><alignment horizontal="right" vertical="center" indent="1"/></xf></cellXfs></styleSheet>`;

const S = {
	title: 1,
	subtitle: 2,
	headLeft: 3,
	headRight: 4,
	text: 5,
	kind: 6,
	dollars: 7,
	counted: 8,
	notCounted: 9,
	totalLabel: 10,
	totalDollars: 11,
	totalCenter: 12,
	date: 13,
	number: 14,
} as const;

const esc = (v: string) =>
	v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const str = (ref: string, style: number, text: string) =>
	`<c r="${ref}" s="${style}" t="inlineStr"><is><t>${esc(text)}</t></is></c>`;

const num = (ref: string, style: number, value: number) =>
	`<c r="${ref}" s="${style}"><v>${value}</v></c>`;

// Excel date serial: days since 1899-12-30 (UTC).
function dateSerial(iso: string): number | null {
	const t = new Date(iso).getTime();
	return Number.isNaN(t) ? null : Math.floor(t / 86400000) + 25569;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

// shortcut: stored (uncompressed) zip, fine for a few hundred rows; swap in a
// zip library if registers grow to many thousands of rows.
function zip(files: Array<[string, string]>): Uint8Array<ArrayBuffer> {
	const enc = new TextEncoder();
	const body: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	for (const [name, text] of files) {
		const nameBytes = enc.encode(name);
		const data = enc.encode(text);
		const crc = crc32(data);
		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true);
		local.setUint16(4, 20, true);
		local.setUint32(14, crc, true);
		local.setUint32(18, data.length, true);
		local.setUint32(22, data.length, true);
		local.setUint16(26, nameBytes.length, true);
		body.push(new Uint8Array(local.buffer), nameBytes, data);
		const entry = new DataView(new ArrayBuffer(46));
		entry.setUint32(0, 0x02014b50, true);
		entry.setUint16(4, 20, true);
		entry.setUint16(6, 20, true);
		entry.setUint32(16, crc, true);
		entry.setUint32(20, data.length, true);
		entry.setUint32(24, data.length, true);
		entry.setUint16(28, nameBytes.length, true);
		entry.setUint32(42, offset, true);
		central.push(new Uint8Array(entry.buffer), nameBytes);
		offset += 30 + nameBytes.length + data.length;
	}
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, files.length, true);
	end.setUint16(10, files.length, true);
	end.setUint32(
		12,
		central.reduce((a, c) => a + c.length, 0),
		true,
	);
	end.setUint32(16, offset, true);
	const parts = [...body, ...central, new Uint8Array(end.buffer)];
	const out = new Uint8Array(
		new ArrayBuffer(parts.reduce((a, p) => a + p.length, 0)),
	);
	let pos = 0;
	for (const p of parts) {
		out.set(p, pos);
		pos += p.length;
	}
	return out;
}

// Date columns accept ISO strings; currency/number columns accept numbers.
export type XlsxColumn = {
	header: string;
	type?: "text" | "date" | "currency" | "number" | "status";
	width?: number;
};
export type XlsxCell = string | number | null | undefined;
// A total cell is a plain value, or a live formula with its cached result.
export type XlsxTotal = XlsxCell | { f: string; v: string | number };

export interface StyledXlsxInput {
	sheetName: string;
	title: string;
	subtitle?: string;
	columns: XlsxColumn[];
	rows: XlsxCell[][];
	totalLabel?: string;
	totals?: XlsxTotal[];
	/** Marks which "status" cells get the green pill; the rest are grey. */
	isPositiveStatus?: (value: string) => boolean;
}

const colRef = (i: number) => String.fromCharCode(65 + i);

function sheetXml(input: StyledXlsxInput): string {
	const { columns, rows } = input;
	const n = rows.length;
	const lastCol = colRef(columns.length - 1);
	const headRow = 4;
	const last = headRow + n;
	const total = last + 1;
	const out: string[] = [
		`<row r="1" ht="26" customHeight="1">${str("A1", S.title, input.title)}</row>`,
	];
	if (input.subtitle) {
		out.push(`<row r="2">${str("A2", S.subtitle, input.subtitle)}</row>`);
	}
	out.push(
		`<row r="${headRow}" ht="24" customHeight="1">${columns
			.map((c, i) =>
				str(
					`${colRef(i)}${headRow}`,
					c.type === "currency" || c.type === "number"
						? S.headRight
						: S.headLeft,
					c.header,
				),
			)
			.join("")}</row>`,
	);
	rows.forEach((row, ri) => {
		const r = headRow + 1 + ri;
		const cells = columns.map((c, ci) => {
			const ref = `${colRef(ci)}${r}`;
			const v = row[ci];
			if (v === null || v === undefined || v === "") {
				return str(ref, c.type === "status" ? S.notCounted : S.text, "");
			}
			switch (c.type) {
				case "date": {
					const serial = dateSerial(String(v));
					return serial === null
						? str(ref, S.text, String(v))
						: num(ref, S.date, serial);
				}
				case "currency":
					return num(ref, S.dollars, Number(v) || 0);
				case "number":
					return num(ref, S.number, Number(v) || 0);
				case "status":
					return str(
						ref,
						input.isPositiveStatus?.(String(v)) ? S.counted : S.notCounted,
						String(v),
					);
				default:
					return str(ref, S.text, String(v));
			}
		});
		out.push(`<row r="${r}" ht="32" customHeight="1">${cells.join("")}</row>`);
	});
	if (input.totals) {
		const cells = columns.map((c, ci) => {
			const ref = `${colRef(ci)}${total}`;
			const t = input.totals?.[ci];
			if (ci === 0) return str(ref, S.totalLabel, input.totalLabel ?? "Total");
			if (t === null || t === undefined) {
				return `<c r="${ref}" s="${S.totalCenter}"/>`;
			}
			const money = c.type === "currency";
			if (typeof t === "object") {
				return typeof t.v === "number"
					? `<c r="${ref}" s="${money ? S.totalDollars : S.totalCenter}"><f>${esc(t.f)}</f><v>${t.v}</v></c>`
					: `<c r="${ref}" s="${S.totalCenter}" t="str"><f>${esc(t.f)}</f><v>${esc(t.v)}</v></c>`;
			}
			return typeof t === "number"
				? num(ref, money ? S.totalDollars : S.totalCenter, t)
				: str(ref, S.totalCenter, t);
		});
		out.push(
			`<row r="${total}" ht="26" customHeight="1">${cells.join("")}</row>`,
		);
	}
	const cols = columns
		.map(
			(c, i) =>
				`<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 20}" customWidth="1"/>`,
		)
		.join("");
	const filter =
		n > 0 ? `<autoFilter ref="A${headRow}:${lastCol}${last}"/>` : "";
	return `${XML}<worksheet xmlns="${NS}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${out.join("")}</sheetData>${filter}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

export const XLSX_MIME =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Styled single-sheet workbook (navy header, hairline rows, total band). */
export function buildStyledXlsx(
	input: StyledXlsxInput,
): Uint8Array<ArrayBuffer> {
	const { sheetName, rows, columns } = input;
	const names =
		rows.length > 0
			? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheetName}'!$A$4:$${colRef(columns.length - 1)}$${4 + rows.length}</definedName></definedNames>`
			: "";
	return zip([
		[
			"[Content_Types].xml",
			`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
		],
		[
			"_rels/.rels",
			`${XML}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
		],
		[
			"xl/workbook.xml",
			`${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>${names}</workbook>`,
		],
		[
			"xl/_rels/workbook.xml.rels",
			`${XML}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
		],
		["xl/styles.xml", STYLES],
		["xl/worksheets/sheet1.xml", sheetXml(input)],
	]);
}
