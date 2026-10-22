import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

/** Mirrors constructFileUrl in @/lib/utils, but for the dedicated screenshots bucket. */
function constructScreenshotUrl(fileId: string): string {
	return `${appwriteConfig.endpointUrl}/storage/buckets/${appwriteConfig.screenshotsBucketId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;
}

const CONTEXT_DEV_SCRAPE_URL = "https://api.context.dev/v1/web/scrape";

interface ContextDevScrapeResponse {
	screenshot?: {
		requested: boolean;
		success: boolean;
		/** Base64 data URL, e.g. "data:image/jpeg;base64,...". */
		data: string | null;
		error_code?: string;
		message?: string;
	};
}

/**
 * Captures a homepage screenshot via Context.dev's scrape API
 * (docs.context.dev/api-reference/web-scraping/scrape) and stores it in the
 * existing Appwrite file bucket. Returns null (never throws) when the API
 * key is unset or the capture fails — callers fall back to the "not
 * available yet" placeholder rather than blocking the crawl on this.
 */
export async function captureSiteScreenshot(
	websiteUrl: string,
): Promise<{ src: string; capturedAt: string } | null> {
	const apiKey = process.env.CONTEXT_DEV_API_KEY;
	if (!apiKey) return null;

	try {
		const res = await fetch(CONTEXT_DEV_SCRAPE_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				url: websiteUrl,
				formats: { screenshot: true },
				screenshotParams: { area: "viewport", format: "jpeg" },
				sharedParams: { viewport: { width: 1280, height: 800 } },
				// Matches the re-crawl rate limit — no point paying for a fresher
				// capture than a user could actually trigger.
				maxAgeMs: 5 * 60 * 1000,
			}),
		});

		if (!res.ok) {
			console.warn(
				`[SERVER] Context.dev scrape failed for ${websiteUrl}: HTTP ${res.status}`,
			);
			return null;
		}

		const body: ContextDevScrapeResponse = await res.json();
		if (!body.screenshot?.success || !body.screenshot.data) {
			console.warn(
				`[SERVER] Context.dev scrape returned no screenshot for ${websiteUrl}`,
				body.screenshot?.message,
			);
			return null;
		}

		const base64 = body.screenshot.data.split(",")[1];
		if (!base64) return null;
		const buffer = Buffer.from(base64, "base64");

		const { storage } = await createAdminClient();
		const fileId = ID.unique();
		await storage.createFile({
			bucketId: appwriteConfig.screenshotsBucketId!,
			fileId,
			file: InputFile.fromBuffer(buffer, `site-screenshot-${fileId}.jpg`),
		});

		return {
			src: constructScreenshotUrl(fileId),
			capturedAt: new Date().toISOString(),
		};
	} catch (error) {
		console.warn(
			"[SERVER] screenshot capture error",
			error instanceof Error ? error.message : error,
		);
		return null;
	}
}
