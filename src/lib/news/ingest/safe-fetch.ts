import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "CAALM-NewsBot/1.0";
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export class SafeFetchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SafeFetchError";
	}
}

function isPrivateIpv4(ip: string): boolean {
	const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
	if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
		return true;
	}
	const [a, b] = parts;
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	return false;
}

function isBlockedHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/\.+$/, "");
	if (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host.endsWith(".local") ||
		host.endsWith(".internal") ||
		host === "metadata.google.internal"
	) {
		return true;
	}
	return false;
}

function isBlockedIp(ip: string): boolean {
	const family = isIP(ip);
	if (family === 4) return isPrivateIpv4(ip);
	if (family === 6) {
		const normalized = ip.toLowerCase();
		return (
			normalized === "::1" ||
			normalized === "::" ||
			normalized.startsWith("fc") ||
			normalized.startsWith("fd") ||
			normalized.startsWith("fe80") ||
			normalized.startsWith("::ffff:")
		);
	}
	return true;
}

export async function assertPublicHostname(hostname: string): Promise<void> {
	if (isBlockedHost(hostname)) {
		throw new SafeFetchError("Host is not allowed");
	}
	if (isIP(hostname)) {
		if (isBlockedIp(hostname)) {
			throw new SafeFetchError("IP address is not allowed");
		}
		return;
	}
	const records = await lookup(hostname, { all: true });
	if (!records.length) {
		throw new SafeFetchError("Host could not be resolved");
	}
	for (const record of records) {
		if (isBlockedIp(record.address)) {
			throw new SafeFetchError("Resolved address is not allowed");
		}
	}
}

export type SafeFetchResult = {
	body: string;
	contentType: string;
	status: number;
	etag?: string | null;
	lastModified?: string | null;
};

export async function safeFetchText(
	target: string,
	init?: { etag?: string | null; lastModified?: string | null },
): Promise<SafeFetchResult | null> {
	let current = target;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
		let parsed: URL;
		try {
			parsed = new URL(current);
		} catch {
			throw new SafeFetchError("Invalid URL");
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new SafeFetchError("Only http and https URLs are allowed");
		}
		await assertPublicHostname(parsed.hostname);

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const headers: Record<string, string> = {
				"User-Agent": USER_AGENT,
				Accept: "application/rss+xml, application/atom+xml, application/json, text/xml, */*",
			};
			if (init?.etag) headers["If-None-Match"] = init.etag;
			if (init?.lastModified) headers["If-Modified-Since"] = init.lastModified;

			const response = await fetch(parsed.toString(), {
				method: "GET",
				redirect: "manual",
				headers,
				signal: controller.signal,
			});

			if ([301, 302, 303, 307, 308].includes(response.status)) {
				const location = response.headers.get("location");
				if (!location) throw new SafeFetchError("Redirect missing location");
				current = new URL(location, parsed).toString();
				continue;
			}

			if (response.status === 304) return null;

			if (!response.ok) {
				throw new SafeFetchError(`Feed responded with ${response.status}`);
			}

			const buffer = await response.arrayBuffer();
			if (buffer.byteLength > MAX_BYTES) {
				throw new SafeFetchError("Response is too large");
			}

			return {
				body: new TextDecoder("utf-8").decode(buffer),
				contentType: response.headers.get("content-type") || "",
				status: response.status,
				etag: response.headers.get("etag"),
				lastModified: response.headers.get("last-modified"),
			};
		} catch (error) {
			if (error instanceof SafeFetchError) throw error;
			if ((error as Error).name === "AbortError") {
				throw new SafeFetchError("Request timed out");
			}
			throw new SafeFetchError(
				error instanceof Error ? error.message : "Fetch failed",
			);
		} finally {
			clearTimeout(timer);
		}
	}
	throw new SafeFetchError("Too many redirects");
}
