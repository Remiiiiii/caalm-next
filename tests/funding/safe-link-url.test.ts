import { describe, expect, it } from "vitest";
import { parseAllowedHttpUrl } from "@/lib/funding/safe-link-url";

describe("parseAllowedHttpUrl", () => {
	it("accepts https and http", () => {
		expect(parseAllowedHttpUrl("https://example.com/path")).toBe(
			"https://example.com/path",
		);
		expect(parseAllowedHttpUrl("http://intranet.local/doc")).toBe(
			"http://intranet.local/doc",
		);
	});

	it("rejects dangerous or non-web schemes", () => {
		expect(parseAllowedHttpUrl("javascript:alert(1)")).toBeUndefined();
		expect(parseAllowedHttpUrl("data:text/html,hi")).toBeUndefined();
		expect(parseAllowedHttpUrl("file:///etc/passwd")).toBeUndefined();
	});

	it("returns undefined for blank input", () => {
		expect(parseAllowedHttpUrl("")).toBeUndefined();
		expect(parseAllowedHttpUrl("   ")).toBeUndefined();
		expect(parseAllowedHttpUrl(null)).toBeUndefined();
	});
});
