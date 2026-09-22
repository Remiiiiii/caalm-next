import { describe, expect, it } from "vitest";
import {
	isProtectedAppRoute,
	isProxyProtectedPath,
} from "@/lib/auth/protectedRoutes";

describe("protected app routes", () => {
	it("treats new nonprofit product paths as protected", () => {
		expect(isProtectedAppRoute("/gifts")).toBe(true);
		expect(isProtectedAppRoute("/gifts/new")).toBe(true);
		expect(isProtectedAppRoute("/campaigns")).toBe(true);
		expect(isProtectedAppRoute("/constituents")).toBe(true);
	});

	it("keeps marketing and counterparty paths public", () => {
		expect(isProtectedAppRoute("/")).toBe(false);
		expect(isProtectedAppRoute("/negotiate/abc123")).toBe(false);
		expect(isProtectedAppRoute("/sign-in")).toBe(false);
		expect(isProtectedAppRoute("/docs/getting-started")).toBe(false);
	});

	it("matches proxy and client helpers", () => {
		expect(isProxyProtectedPath("/gifts")).toBe(isProtectedAppRoute("/gifts"));
		expect(isProxyProtectedPath("/")).toBe(isProtectedAppRoute("/"));
	});
});
