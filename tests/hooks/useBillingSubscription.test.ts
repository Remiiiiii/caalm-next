import { afterEach, describe, expect, it, vi } from "vitest";
import {
	emptyBillingSubscription,
	fetchBillingSubscription,
} from "@/hooks/useBillingSubscription";
import { swrConfig } from "@/lib/swr-config";

describe("fetchBillingSubscription", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns an empty payload on 404 instead of throwing", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(JSON.stringify({ error: "Organization not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);

		const data = await fetchBillingSubscription([
			"/api/billing/subscription?orgId=default_organization",
			"default_organization",
		]);

		expect(data).toEqual(emptyBillingSubscription());
	});

	it("returns an empty payload on 503 timeouts", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(
					JSON.stringify({ error: "Organization temporarily unavailable" }),
					{
						status: 503,
						headers: { "Content-Type": "application/json" },
					},
				),
			),
		);

		const data = await fetchBillingSubscription([
			"/api/billing/subscription?orgId=default_organization",
			"default_organization",
		]);

		expect(data).toEqual(emptyBillingSubscription());
	});

	it("returns an empty payload when fetch fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("fetch failed");
			}),
		);

		const data = await fetchBillingSubscription([
			"/api/billing/subscription?orgId=default_organization",
			"default_organization",
		]);

		expect(data).toEqual(emptyBillingSubscription());
	});

	it("still throws 403 so permission failures stay visible", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(JSON.stringify({ error: "Access denied" }), {
					status: 403,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);

		await expect(
			fetchBillingSubscription([
				"/api/billing/subscription?orgId=default_organization",
				"default_organization",
			]),
		).rejects.toMatchObject({ status: 403, message: "Access denied" });
	});
});

describe("swrConfig.onError", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("does not console.error on billing 404 (Next overlay trigger)", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = new Error("Organization not found") as Error & {
			status?: number;
		};

		swrConfig.onError?.(
			error,
			[
				"/api/billing/subscription?orgId=default_organization",
				"default_organization",
			],
			{} as never,
			{} as never,
		);

		expect(errorSpy).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("does not console.error on 4xx with status", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const error = new Error("Not found") as Error & { status?: number };
		error.status = 404;

		swrConfig.onError?.(error, "/api/users", {} as never, {} as never);

		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("uses console.warn, not console.error, for unexpected 5xx", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = new Error("Server exploded") as Error & { status?: number };
		error.status = 500;

		swrConfig.onError?.(error, "/api/something", {} as never, {} as never);

		expect(errorSpy).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalled();
	});
});
