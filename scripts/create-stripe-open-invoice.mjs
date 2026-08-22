/**
 * Creates a finalized open Stripe invoice for QA (blocked default-card remove).
 *
 * Usage:
 *   node scripts/create-stripe-open-invoice.mjs --customer cus_xxx
 *   node scripts/create-stripe-open-invoice.mjs --org-id default_organization
 *
 * Loads STRIPE_SECRET_KEY from .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

function loadEnvLocal() {
	const path = resolve(process.cwd(), ".env.local");
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = value;
	}
}

function parseArgs(argv) {
	const args = { customer: "", orgId: "" };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === "--customer") args.customer = argv[i + 1] || "";
		if (argv[i] === "--org-id") args.orgId = argv[i + 1] || "";
	}
	return args;
}

async function resolveCustomerId(stripe, { customer, orgId }) {
	if (customer) return customer;
	if (!orgId) {
		throw new Error("Pass --customer cus_xxx or --org-id <orgId>");
	}

	const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
	const appwriteProject = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
	const apiKey =
		process.env.NEXT_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
	const databaseId =
		process.env.NEXT_PUBLIC_APPWRITE_DATABASE || "685ed87c0009d8189fc7";
	const orgsTable = "organizations";

	if (!appwriteEndpoint || !appwriteProject || !apiKey) {
		throw new Error(
			"For --org-id, set NEXT_PUBLIC_APPWRITE_*, NEXT_APPWRITE_API_KEY in .env.local",
		);
	}

	const url = `${appwriteEndpoint}/tablesdb/${databaseId}/tables/${orgsTable}/rows/${orgId}`;
	const res = await fetch(url, {
		headers: {
			"X-Appwrite-Project": appwriteProject,
			"X-Appwrite-Key": apiKey,
		},
	});
	if (!res.ok) {
		throw new Error(`Could not load org ${orgId}: ${res.status}`);
	}
	const doc = await res.json();
	const stripeCustomerId = doc.stripeCustomerId;
	if (!stripeCustomerId) {
		throw new Error(`Org ${orgId} has no stripeCustomerId`);
	}
	return stripeCustomerId;
}

loadEnvLocal();

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
	console.error("STRIPE_SECRET_KEY missing in .env.local");
	process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const stripe = new Stripe(secret);

const customerId = await resolveCustomerId(stripe, args);

await stripe.invoiceItems.create({
	customer: customerId,
	amount: 7900,
	currency: "usd",
	description: "CAALM QA — open invoice for blocked default-card remove test",
});

const draft = await stripe.invoices.create({
	customer: customerId,
	collection_method: "send_invoice",
	days_until_due: 30,
	auto_advance: false,
	pending_invoice_items_behavior: "include",
});

const invoice = await stripe.invoices.finalizeInvoice(draft.id);

console.log("Open invoice created.");
console.log(`  customer: ${customerId}`);
console.log(`  invoice:  ${invoice.id}`);
console.log(`  status:   ${invoice.status}`);
console.log(`  total:    ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency}`);
