/**
 * Compose a 15s CAALM light-scene motion demo from Tier-1 screenshots.
 * Magnific AI generation was skipped by the user; this produces H.264 1920x1080 @ 30fps.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const SHOTS = path.join(ROOT, "public/assets/video/demo-screenshots");
const OUT_DIR = path.join(ROOT, "public/assets/video");
const OUT = path.join(OUT_DIR, "caalm-demo-15s.mp4");
const TMP = path.join(OUT_DIR, "_demo-tmp");

const W = 1920;
const H = 1080;
const FPS = 30;

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: "inherit", shell: false });
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
		);
	});
}

async function makeEndCard() {
	const endCard = path.join(TMP, "end-card.png");
	const htmlPath = path.join(TMP, "end-card.html");
	await writeFile(
		htmlPath,
		`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fcfdff 0%, rgba(0,193,203,0.05) 28%, rgba(14,99,143,0.06) 55%, rgba(22,39,104,0.04) 78%, #f2f4f8 100%);
    font-family: Inter, Segoe UI, Arial, sans-serif;
  }
  .card {
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(226,232,240,0.9);
    box-shadow: 0 8px 32px rgba(31,38,135,0.15);
    border-radius: 24px;
    padding: 56px 80px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 10px;
    background: #d6d7d8;
    opacity: 0.7;
  }
  .brand {
    font-size: 64px;
    font-weight: 700;
    background: linear-gradient(135deg, #12477d 0%, #03AFBF 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0 0 16px;
  }
  .headline {
    font-size: 44px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 12px;
  }
  .sub {
    font-size: 24px;
    color: #475569;
    margin: 0 0 28px;
  }
  .cta {
    display: inline-block;
    background: #0f5384;
    color: #fff;
    font-size: 22px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: 999px;
  }
</style>
</head>
<body>
  <div class="card">
    <p class="brand">CAALM</p>
    <p class="headline">Compliance, centralized.</p>
    <p class="sub">Contracts · Licenses · Audits</p>
    <span class="cta">See CAALM in action</span>
  </div>
</body>
</html>`,
		"utf8",
	);

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: W, height: H } });
	await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`);
	await page.waitForTimeout(300);
	await page.screenshot({ path: endCard, type: "png" });
	await browser.close();
	return endCard;
}

/** Soft pad + gentle Ken Burns on a still */
async function stillToClip(input, output, duration, zoomEnd = 1.08) {
	const frames = Math.round(duration * FPS);
	await run("ffmpeg", [
		"-y",
		"-loop",
		"1",
		"-i",
		input,
		"-vf",
		[
			`scale=${W}:${H}:force_original_aspect_ratio=increase`,
			`crop=${W}:${H}`,
			// Soft brand wash vignette overlay for light color grade
			`eq=contrast=1.02:brightness=0.02:saturation=1.05`,
			`zoompan=z='min(1.0+(${zoomEnd}-1.0)*on/${frames},${zoomEnd})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`,
			"format=yuv420p",
		].join(","),
		"-t",
		String(duration),
		"-r",
		String(FPS),
		"-c:v",
		"libx264",
		"-pix_fmt",
		"yuv420p",
		"-an",
		output,
	]);
}

async function concatWithXfade(clipPaths, durations, output) {
	// Build xfade chain across clips
	const inputs = [];
	for (const p of clipPaths) {
		inputs.push("-i", p);
	}

	const fade = 0.4;
	let filter = "";
	let offset = durations[0] - fade;
	let last = "[0:v]";

	for (let i = 1; i < clipPaths.length; i++) {
		const out = i === clipPaths.length - 1 ? "[vout]" : `[v${i}]`;
		filter += `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}${out};`;
		last = out;
		if (i < clipPaths.length - 1) {
			offset += durations[i] - fade;
		}
	}

	await run("ffmpeg", [
		"-y",
		...inputs,
		"-filter_complex",
		filter.slice(0, -1),
		"-map",
		"[vout]",
		"-c:v",
		"libx264",
		"-pix_fmt",
		"yuv420p",
		"-r",
		String(FPS),
		"-movflags",
		"+faststart",
		output,
	]);
}

async function main() {
	await mkdir(TMP, { recursive: true });

	const hero = path.join(SHOTS, "06-landing-hero.png");
	const ask = path.join(SHOTS, "13-feature-spotlight.png");
	const contracts = path.join(SHOTS, "02-contracts-table.png");
	const audits = path.join(SHOTS, "04-audits-status.png");
	const dashboard = path.join(SHOTS, "01-dashboard-full.png");

	const endCard = await makeEndCard();

	const clips = [
		{ in: hero, out: path.join(TMP, "01-open.mp4"), d: 2.0, z: 1.06 },
		{ in: ask, out: path.join(TMP, "02-ask.mp4"), d: 3.0, z: 1.05 },
		{ in: dashboard, out: path.join(TMP, "03-dash.mp4"), d: 2.0, z: 1.07 },
		{ in: contracts, out: path.join(TMP, "04-contracts.mp4"), d: 2.0, z: 1.06 },
		{ in: audits, out: path.join(TMP, "05-audits.mp4"), d: 2.0, z: 1.06 },
		// 6s end + five 0.4s xfades → final duration ≈ 15s
		{ in: endCard, out: path.join(TMP, "06-end.mp4"), d: 6.0, z: 1.03 },
	];

	for (const c of clips) {
		console.log("clip", path.basename(c.out), c.d, "s");
		await stillToClip(c.in, c.out, c.d, c.z);
	}

	await concatWithXfade(
		clips.map((c) => c.out),
		clips.map((c) => c.d),
		OUT,
	);

	// Keep end-card PNG in screenshots folder for reuse
	await run("ffmpeg", [
		"-y",
		"-i",
		endCard,
		path.join(SHOTS, "end-card.png"),
	]);

	console.log("wrote", OUT);
	await rm(TMP, { recursive: true, force: true }).catch(() => {});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
