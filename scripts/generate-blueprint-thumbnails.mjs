#!/usr/bin/env node
/**
 * Pre-render page-1 thumbnails from the 10 agreement .docx files.
 * Skips a file when sha256(docx) matches the last generated hash.
 *
 * Usage:
 *   node scripts/generate-blueprint-thumbnails.mjs
 *   node scripts/generate-blueprint-thumbnails.mjs --dir "C:/Users/victo/Downloads/files/updated"
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	DOCX_PREVIEW_CSS,
	docxBufferToHtml,
} from "../src/lib/templates/docx-html.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const dirArg = process.argv.find((arg, i) => process.argv[i - 1] === "--dir");
const FORCE = process.argv.includes("--force");
const SOURCE = dirArg || path.join(os.homedir(), "Downloads", "files", "updated");
const OUT = path.join(ROOT, ".tmp-blueprint-thumbs");
const PUBLIC_DIR = path.join(ROOT, "public", "assets", "contract-blueprints");
const HASH_FILE = path.join(ROOT, "src/lib/templates/blueprint-thumbnail-hashes.json");

const FILES = [
	["vendor", "01_Vendor_Service_Agreement.docx"],
	["grant", "02_Grant_Agreement.docx"],
	["government", "03_Government_Contract.docx"],
	["lease", "04_Lease_Agreement.docx"],
	["consulting", "05_Consulting_Agreement.docx"],
	["mou", "06_Memorandum_of_Understanding.docx"],
	["donation", "07_Donation_Gift_Agreement.docx"],
	["independent_contractor", "08_Independent_Contractor_Agreement.docx"],
	["fiscal_sponsorship", "09_Fiscal_Sponsorship_Agreement.docx"],
	["employment", "10_Employment_Contract.docx"],
];

// ~3x a ~400px-wide card, US Letter (8.5:11).
const WIDTH = 1200;
const HEIGHT = Math.round(WIDTH * (11 / 8.5));

function findBrowser() {
	const candidates = [
		path.join(process.env["ProgramFiles"] || "", "Google/Chrome/Application/chrome.exe"),
		path.join(process.env["ProgramFiles(x86)"] || "", "Google/Chrome/Application/chrome.exe"),
		path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
		path.join(process.env["ProgramFiles"] || "", "Microsoft/Edge/Application/msedge.exe"),
	];
	return candidates.find((row) => fs.existsSync(row));
}

function sha256File(filePath) {
	return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function pageHtml(body) {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    .page {
      width: ${WIDTH}px;
      min-height: ${HEIGHT}px;
      margin: 0;
      padding: 72px 96px;
      box-sizing: border-box;
      background: #fff;
    }
    ${DOCX_PREVIEW_CSS}
    .docx-preview { font-size: 20px; }
    .docx-title { font-size: 26px; }
    .docx-letterhead-org { font-size: 16px; }
  </style>
</head>
<body>
  <div class="page docx-preview">${body}</div>
</body>
</html>`;
}

function pathToFileURL(filePath) {
	const resolved = path.resolve(filePath).replace(/\\/g, "/");
	return `file:///${resolved}`;
}

const browser = findBrowser();
if (!browser) {
	console.error("Chrome or Edge is required to snapshot thumbnails.");
	process.exit(1);
}

const previous = fs.existsSync(HASH_FILE)
	? JSON.parse(fs.readFileSync(HASH_FILE, "utf8"))
	: {};
const nextHashes = { ...previous };

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

for (const [id, fileName] of FILES) {
	const docxPath = path.join(SOURCE, fileName);
	if (!fs.existsSync(docxPath)) {
		console.error(`Missing ${docxPath}`);
		process.exit(1);
	}
	const hash = sha256File(docxPath);
	const shortHash = hash.slice(0, 12);
	const publicName = `${id}.${shortHash}.w1.png`;
	const publicPng = path.join(PUBLIC_DIR, publicName);
	if (!FORCE && previous[id] === hash && fs.existsSync(publicPng)) {
		console.log(`Skip ${id} (unchanged ${shortHash})`);
		continue;
	}

	const converted = await docxBufferToHtml(fs.readFileSync(docxPath), {
		imageScale: WIDTH / 816,
	});
	const htmlPath = path.join(OUT, `${id}.html`);
	const pngPath = path.join(OUT, `${id}.png`);
	fs.writeFileSync(htmlPath, pageHtml(converted), "utf8");
	execFileSync(
		browser,
		[
			"--headless=new",
			"--disable-gpu",
			"--hide-scrollbars",
			`--window-size=${WIDTH},${HEIGHT}`,
			`--screenshot=${pngPath}`,
			pathToFileURL(htmlPath),
		],
		{ stdio: "ignore" },
	);
	if (!fs.existsSync(pngPath)) {
		console.error(`Screenshot failed for ${id}`);
		process.exit(1);
	}
	fs.copyFileSync(pngPath, publicPng);
	for (const name of fs.readdirSync(PUBLIC_DIR)) {
		if (name === publicName) continue;
		if (name === `${id}.png` || (name.startsWith(`${id}.`) && name.endsWith(".png"))) {
			fs.unlinkSync(path.join(PUBLIC_DIR, name));
		}
	}
	nextHashes[id] = hash;
	console.log(`Wrote ${publicName}`);
}

fs.writeFileSync(HASH_FILE, `${JSON.stringify(nextHashes, null, "\t")}\n`);
console.log(`Thumbnails in ${PUBLIC_DIR}`);
