import fs from "node:fs";
import Stripe from "stripe";

function loadEnv(file) {
	if (!fs.existsSync(file)) return;
	for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1).trim();
		if (!process.env[key]) process.env[key] = value;
	}
}

function normalize(name, prefix) {
	let value = process.env[name];
	if (!value) return { ok: false, reason: "missing" };
	if (value.startsWith(`${name}=`)) {
		value = value.slice(name.length + 1);
	}
	if (prefix && !value.startsWith(prefix)) {
		return { ok: false, reason: "invalid format" };
	}
	if (value.includes("...")) {
		return { ok: false, reason: "placeholder" };
	}
	process.env[name] = value;
	return { ok: true };
}

loadEnv(".env.local");

const checks = {
	STRIPE_SECRET_KEY: normalize("STRIPE_SECRET_KEY", "sk_"),
	STRIPE_WEBHOOK_SECRET: normalize("STRIPE_WEBHOOK_SECRET", "whsec_"),
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: normalize(
		"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
		"pk_",
	),
};

const priceKeys = [
	"STRIPE_PRICE_STARTER_MONTHLY",
	"STRIPE_PRICE_STARTER_YEARLY",
	"STRIPE_PRICE_GROWTH_MONTHLY",
	"STRIPE_PRICE_GROWTH_YEARLY",
	"STRIPE_PRICE_ENTERPRISE_MONTHLY",
	"STRIPE_PRICE_ENTERPRISE_YEARLY",
];

console.log("Stripe env check");
for (const [name, result] of Object.entries(checks)) {
	console.log(`- ${name}: ${result.ok ? "OK" : result.reason}`);
}
for (const key of priceKeys) {
	const val = process.env[key];
	console.log(
		`- ${key}: ${val?.startsWith("price_") ? "OK" : val ? "invalid" : "missing"}`,
	);
}

if (!checks.STRIPE_SECRET_KEY.ok) {
	console.log("Connection: skipped (secret key not usable)");
	process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
try {
	const account = await stripe.accounts.retrieve();
	console.log("Connection: OK");
	console.log(
		"Account:",
		account.id,
		account.settings?.dashboard?.display_name || "(no display name)",
	);
} catch (err) {
	console.log("Connection: FAILED");
	console.log("Error:", err?.message || err);
	process.exit(1);
}

const missingPrices = priceKeys.filter((k) => !process.env[k]);
if (missingPrices.length) {
	console.log("Price lookup: skipped (missing price env vars)");
	process.exit(1);
}

try {
	for (const key of priceKeys) {
		const price = await stripe.prices.retrieve(process.env[key]);
		if (!price.active) throw new Error(`${key} is inactive`);
	}
	console.log("Price lookup: OK (6/6 active prices)");
} catch (err) {
	console.log("Price lookup: FAILED");
	console.log("Error:", err?.message || err);
	process.exit(1);
}
