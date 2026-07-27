import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMOS, renderDemoPage } from "./demo-assets/demo-templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve("public/assets/icons/demo-video/generated");
const ASSETS = path.join(__dirname, "demo-assets");

async function main() {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: "light",
	});

	for (const demo of DEMOS) {
		const html = renderDemoPage({
			title: demo.title,
			activeNav: demo.activeNav,
			content: demo.content,
			flush: demo.flush,
		});
		const htmlPath = path.join(ASSETS, demo.html);
		await writeFile(htmlPath, html, "utf8");

		const page = await context.newPage();
		const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
		await page.goto(fileUrl, { waitUntil: "networkidle" });
		await page.waitForTimeout(1500);

		const outFile = path.join(OUT, demo.file);
		await page.screenshot({ path: outFile, type: "png", fullPage: false });
		console.log("saved", outFile);
		await page.close();
	}

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
