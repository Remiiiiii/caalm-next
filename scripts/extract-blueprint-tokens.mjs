#!/usr/bin/env node
/**
 * Extract {{TOKEN}} placeholders from the 10 agreement blueprints.
 *
 * Usage:
 *   node scripts/extract-blueprint-tokens.mjs
 *   node scripts/extract-blueprint-tokens.mjs --dir "C:/Users/victo/Downloads/files/updated"
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_DIR = path.join(os.homedir(), "Downloads", "files", "updated");
const dirArg = process.argv.find((arg, i) => process.argv[i - 1] === "--dir");
const sourceDir = dirArg || DEFAULT_DIR;
const FILES = [
	["01_Vendor_Service_Agreement.docx", "vendor"],
	["02_Grant_Agreement.docx", "grant"],
	["03_Government_Contract.docx", "government"],
	["04_Lease_Agreement.docx", "lease"],
	["05_Consulting_Agreement.docx", "consulting"],
	["06_Memorandum_of_Understanding.docx", "mou"],
	["07_Donation_Gift_Agreement.docx", "donation"],
	["08_Independent_Contractor_Agreement.docx", "independent_contractor"],
	["09_Fiscal_Sponsorship_Agreement.docx", "fiscal_sponsorship"],
	["10_Employment_Contract.docx", "employment"],
];

function extractTokens(docxPath) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "caalm-docx-"));
	const zipPath = path.join(tmp, "file.zip");
	fs.copyFileSync(docxPath, zipPath);
	if (process.platform === "win32") {
		execSync(
			`powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
		);
	} else {
		execSync(`unzip -o "${zipPath}" -d "${tmp}"`);
	}
	const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf8");
	const tokens = [...xml.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
	const broken = [...xml.matchAll(/\{\{|\}\}/g)].length !== tokens.length * 2;
	return { tokens: [...new Set(tokens)], broken };
}

const manifest = {};
const flags = [];
for (const [fileName, id] of FILES) {
	const full = path.join(sourceDir, fileName);
	if (!fs.existsSync(full)) {
		console.error(`Missing ${full}`);
		process.exit(1);
	}
	const { tokens, broken } = extractTokens(full);
	manifest[id] = tokens;
	if (broken) flags.push(id);
	console.log(`${id}: ${tokens.length} tokens`);
}

const out = path.join(ROOT, "src/lib/templates/blueprint-token-manifest.json");
fs.writeFileSync(out, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`Wrote ${out}`);
if (flags.length) {
	console.warn(`Split/broken tokens flagged: ${flags.join(", ")}`);
}
