import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve("public/assets/icons/demo-video/generated");
const STATIC_HTML = path.join(
	__dirname,
	"demo-assets",
	"demo-06-analytics.html",
);

async function captureFromStaticReplica(page) {
	const fileUrl = `file:///${STATIC_HTML.replace(/\\/g, "/")}`;
	await page.goto(fileUrl, { waitUntil: "networkidle" });
	await page.waitForTimeout(1500);
}

async function main() {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: "light",
	});
	const page = await context.newPage();

	await captureFromStaticReplica(page);
	console.log("Captured static CAALM analytics replica");

	const file = path.join(OUT, "demo-06-analytics.png");
	await page.screenshot({ path: file, type: "png", fullPage: false });
	console.log("saved", file);

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
