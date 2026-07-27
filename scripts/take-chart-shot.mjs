import { chromium } from "@playwright/test";
import { access } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve("public/assets/icons/demo-video/generated");
const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000";
const AUTH =
	process.env.DEMO_STORAGE_STATE ||
	path.resolve("tests/.auth/user.json");
const STATIC_HTML = path.join(
	__dirname,
	"demo-assets",
	"demo-05-audit-charts.html",
);

async function authFileExists() {
	try {
		await access(AUTH);
		return true;
	} catch {
		return false;
	}
}

async function injectReferenceCharts(page) {
	await page.evaluate(() => {
		const patchCard = (title, html) => {
			const heading = [...document.querySelectorAll("h3")].find((el) =>
				el.textContent?.includes(title),
			);
			if (!heading) return;
			const card = heading.closest(".glass-card") || heading.parentElement?.closest(".glass-card");
			if (!card) return;
			const container =
				card.querySelector('[class*="h-[240px]"]') ||
				card.querySelector('[class*="h-[280px]"]') ||
				card.querySelector(".recharts-responsive-container")?.parentElement;
			if (container) container.innerHTML = html;
		};

		patchCard(
			"Obligations by filing type",
			`<div class="legend" style="display:flex;gap:1rem;font-size:12px;color:#64748b;margin-bottom:8px">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:#1e1e64;margin-right:4px"></span>Total obligations</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:#03AFBF;margin-right:4px"></span>Completed obligations</span>
      </div>
      <svg viewBox="0 0 420 220" width="100%" height="220"><line x1="40" y1="180" x2="400" y2="180" stroke="#e2e8f0"/><line x1="40" y1="20" x2="40" y2="180" stroke="#e2e8f0"/>
      <rect x="70" y="48" width="28" height="132" rx="2" fill="#1e1e64"/><text x="74" y="42" fill="#475569" font-size="11">212</text>
      <rect x="102" y="62" width="28" height="118" rx="2" fill="#03AFBF"/><text x="106" y="56" fill="#475569" font-size="11">196</text>
      <text x="78" y="198" fill="#64748b" font-size="11">Form 990</text>
      <rect x="170" y="86" width="28" height="94" rx="2" fill="#1e1e64"/><text x="174" y="80" fill="#475569" font-size="11">145</text>
      <rect x="202" y="118" width="28" height="62" rx="2" fill="#03AFBF"/><text x="206" y="112" fill="#475569" font-size="11">112</text>
      <text x="172" y="198" fill="#64748b" font-size="11">State reg</text>
      <rect x="270" y="128" width="28" height="52" rx="2" fill="#1e1e64"/><text x="274" y="122" fill="#475569" font-size="11">78</text>
      <rect x="302" y="142" width="28" height="38" rx="2" fill="#03AFBF"/><text x="308" y="136" fill="#475569" font-size="11">61</text>
      <text x="258" y="198" fill="#64748b" font-size="11">Grant reports</text></svg>`,
		);

		patchCard(
			"Deadline status (RAG)",
			`<div style="display:flex;align-items:center;height:240px">
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#e2e8f0" stroke-width="24"/>
          <circle cx="100" cy="100" r="70" fill="none" stroke="#03AFBF" stroke-width="24" stroke-dasharray="316 440" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="70" fill="none" stroke="#EF4444" stroke-width="24" stroke-dasharray="62 440" stroke-dashoffset="-316" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="70" fill="none" stroke="#F59E0B" stroke-width="24" stroke-dasharray="62 440" stroke-dashoffset="-378" transform="rotate(-90 100 100)"/>
          <text x="100" y="96" text-anchor="middle" fill="#1e293b" font-size="28" font-weight="700">435</text>
          <text x="100" y="118" text-anchor="middle" fill="#64748b" font-size="11">Total obligations</text>
        </svg>
        <div style="flex:1;padding-left:24px;font-size:14px;color:#475569;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:#03AFBF;margin-right:6px"></span>On time</span><span><strong>72%</strong> (313)</span></div>
          <div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:#EF4444;margin-right:6px"></span>Overdue</span><span><strong>14%</strong> (61)</span></div>
          <div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:#F59E0B;margin-right:6px"></span>Due soon</span><span><strong>14%</strong> (61)</span></div>
          <div style="margin-top:16px;text-align:right;color:#03AFBF;font-weight:500">View all obligations &gt;</div>
        </div>
      </div>`,
		);
	});
}

async function captureFromLiveApp(page) {
	await page.goto(`${BASE}/audits/status?tab=regulatory`, {
		waitUntil: "networkidle",
	});
	await page.waitForTimeout(2500);

	if (/sign-in|login|invite/i.test(page.url())) {
		return false;
	}

	await page
		.getByRole("heading", { name: /compliance status/i })
		.waitFor({ timeout: 15000 })
		.catch(() => {});

	const regulatoryTab = page.getByRole("tab", {
		name: /regulatory & filings/i,
	});
	if (await regulatoryTab.count()) {
		await regulatoryTab.click();
		await page.waitForTimeout(1500);
	}

	const trend = page.getByText("Filing timeliness trend").first();
	if (await trend.count()) {
		await trend.scrollIntoViewIfNeeded();
		await page.waitForTimeout(800);
	}

	await injectReferenceCharts(page);
	await page.waitForTimeout(500);

	return true;
}

async function captureFromStaticReplica(page) {
	const fileUrl = `file:///${STATIC_HTML.replace(/\\/g, "/")}`;
	await page.goto(fileUrl, { waitUntil: "networkidle" });
	await page.waitForTimeout(1500);
	return true;
}

async function main() {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch({ headless: true });

	const contextOptions = {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: "light",
	};

	if (await authFileExists()) {
		contextOptions.storageState = AUTH;
	}

	const context = await browser.newContext(contextOptions);
	const page = await context.newPage();

	// Always use the static replica so Sidebar + DashboardHeader mocks stay consistent.
	await captureFromStaticReplica(page);
	console.log("Captured static CAALM replica (Sidebar + DashboardHeader)");

	const file = path.join(OUT, "demo-05-audit-charts.png");
	await page.screenshot({ path: file, type: "png", fullPage: false });
	console.log("saved", file);

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
