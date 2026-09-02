#!/usr/bin/env node
/**
 * Upload the 10 agreement blueprints + placeholder thumbnails to Appwrite.
 *
 * Usage:
 *   node scripts/seed-contract-blueprints.mjs
 *   node scripts/seed-contract-blueprints.mjs --dir "C:/Users/victo/Downloads/files/updated"
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
	/\/$/,
	"",
);
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const API_KEY =
	process.env.NEXT_APPWRITE_API_KEY || process.env.NEXT_APPWRITE_KEY;
const BUCKET =
	process.env.NEXT_PUBLIC_APPWRITE_CONTRACT_BLUEPRINTS_BUCKET ||
	"69c8f503003c4d5e6f04";
const dirArg = process.argv.find((arg, i) => process.argv[i - 1] === "--dir");
const SOURCE = dirArg || path.join(os.homedir(), "Downloads", "files", "updated");

const FILES = [
	["vendor", "01_Vendor_Service_Agreement.docx", "bp01vendordocx", "bp01vendorthumb"],
	["grant", "02_Grant_Agreement.docx", "bp02grantdocx", "bp02grantthumb"],
	["government", "03_Government_Contract.docx", "bp03govdocx", "bp03govthumb"],
	["lease", "04_Lease_Agreement.docx", "bp04leasedocx", "bp04leasethumb"],
	["consulting", "05_Consulting_Agreement.docx", "bp05consultdocx", "bp05consultthumb"],
	["mou", "06_Memorandum_of_Understanding.docx", "bp06moudocx", "bp06mouthumb"],
	["donation", "07_Donation_Gift_Agreement.docx", "bp07donationdocx", "bp07donationthumb"],
	["independent_contractor", "08_Independent_Contractor_Agreement.docx", "bp08icondocx", "bp08iconthumb"],
	["fiscal_sponsorship", "09_Fiscal_Sponsorship_Agreement.docx", "bp09fiscaldocx", "bp09fiscalthumb"],
	["employment", "10_Employment_Contract.docx", "bp10employdocx", "bp10employthumb"],
];

// Minimal 1x1 PNG.
const PNG = Buffer.from(
	"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
	"hex",
);

if (!ENDPOINT || !PROJECT || !API_KEY) {
	console.error("Missing Appwrite endpoint, project, or API key in .env.local");
	process.exit(1);
}

async function upsertFile(fileId, fileName, buffer, mime) {
	const headers = {
		"X-Appwrite-Project": PROJECT,
		"X-Appwrite-Key": API_KEY,
	};
	await fetch(`${ENDPOINT}/storage/buckets/${BUCKET}/files/${fileId}`, {
		method: "DELETE",
		headers,
	}).catch(() => undefined);

	const form = new FormData();
	form.set("fileId", fileId);
	form.set(
		"file",
		new Blob([buffer], { type: mime }),
		fileName,
	);
	const response = await fetch(`${ENDPOINT}/storage/buckets/${BUCKET}/files`, {
		method: "POST",
		headers,
		body: form,
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Upload ${fileId} failed: ${response.status} ${text}`);
	}
	return response.json();
}

for (const [id, fileName, docxId, thumbId] of FILES) {
	const full = path.join(SOURCE, fileName);
	if (!fs.existsSync(full)) {
		console.error(`Missing ${full}`);
		process.exit(1);
	}
	const buffer = fs.readFileSync(full);
	const publicDir = path.join(ROOT, "public", "assets", "contract-blueprints");
	const hashed = fs.existsSync(publicDir)
		? fs
				.readdirSync(publicDir)
				.find((name) => name.startsWith(`${id}.`) && name.endsWith(".png"))
		: null;
	const publicThumb = hashed
		? path.join(publicDir, hashed)
		: path.join(publicDir, `${id}.png`);
	const tmpThumb = path.join(ROOT, ".tmp-blueprint-thumbs", `${id}.png`);
	const thumbPath = fs.existsSync(publicThumb) ? publicThumb : tmpThumb;
	const thumb = fs.existsSync(thumbPath) ? fs.readFileSync(thumbPath) : PNG;
	await upsertFile(
		docxId,
		fileName,
		buffer,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	);
	await upsertFile(thumbId, `${id}.png`, thumb, "image/png");
	console.log(
		`Uploaded ${id} (${createHash("sha1").update(buffer).digest("hex").slice(0, 8)})`,
	);
}
console.log("Seed complete.");
