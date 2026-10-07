import { describe, expect, it } from "vitest";
import { assertPublicHostname, SafeFetchError } from "@/lib/news/ingest/safe-fetch";

describe("SSRF guard", () => {
	it("blocks localhost", async () => {
		await expect(assertPublicHostname("localhost")).rejects.toBeInstanceOf(
			SafeFetchError,
		);
	});

	it("blocks loopback IPs", async () => {
		await expect(assertPublicHostname("127.0.0.1")).rejects.toBeInstanceOf(
			SafeFetchError,
		);
	});

	it("blocks private IPv4", async () => {
		await expect(assertPublicHostname("10.0.0.8")).rejects.toBeInstanceOf(
			SafeFetchError,
		);
		await expect(assertPublicHostname("192.168.1.10")).rejects.toBeInstanceOf(
			SafeFetchError,
		);
	});
});
