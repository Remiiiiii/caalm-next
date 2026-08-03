import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const OUT = path.resolve("public/assets/video/demo-screenshots");
const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000";

async function waitForSettle(page, ms = 1200) {
	await page.waitForLoadState("networkidle").catch(() => {});
	await page.waitForTimeout(ms);
}

async function shot(page, name) {
	const file = path.join(OUT, name);
	await page.screenshot({ path: file, type: "png", fullPage: false });
	console.log("saved", file);
}

async function main() {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: 1,
		colorScheme: "light",
	});
	const page = await context.newPage();

	// 06 — Landing hero
	await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
	await waitForSettle(page, 2000);
	await page.evaluate(() => window.scrollTo(0, 0));
	await waitForSettle(page, 500);
	await shot(page, "06-landing-hero.png");

	// 05 — Product spotlight (Contracts)
	const platform = page.locator("#platform");
	if (await platform.count()) {
		await platform.scrollIntoViewIfNeeded();
		await waitForSettle(page, 1500);
		await shot(page, "05-platform-contracts.png");
	}

	// Extra: Licenses / Audits / Analytics tabs for montage richness
	for (const [tab, file] of [
		["Licenses", "05b-platform-licenses.png"],
		["Audits", "05c-platform-audits.png"],
		["Analytics", "05d-platform-analytics.png"],
	]) {
		const btn = page.getByRole("tab", { name: tab });
		if (await btn.count()) {
			await btn.click();
			await waitForSettle(page, 1200);
			await shot(page, file);
		}
	}

	// Feature spotlight for Ask CAALM / alerts
	const features = page.getByRole("heading", {
		name: /Powerful workflows that make sense/i,
	});
	if (await features.count()) {
		await features.scrollIntoViewIfNeeded();
		await waitForSettle(page, 1000);
		await shot(page, "13-feature-spotlight.png");
	}

	// Authenticated routes — capture if session exists, else note redirect
	const authRoutes = [
		["/dashboard", "01-dashboard-full.png"],
		["/contracts", "02-contracts-table.png"],
		["/licenses", "03-licenses-table.png"],
		["/audits/status", "04-audits-status.png"],
		["/analytics", "07-analytics.png"],
		["/calendar", "09-calendar.png"],
	];

	for (const [route, file] of authRoutes) {
		await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
		await waitForSettle(page, 2500);
		const url = page.url();
		if (/sign-in|login|invite/i.test(url)) {
			console.log("skip auth required:", route, "->", url);
			continue;
		}
		await shot(page, file);
	}

	await browser.close();
	console.log("done");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
