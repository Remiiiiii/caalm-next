import { describe, expect, it } from "vitest";
import { isItRoute } from "@/lib/ui/it-routes";

describe("isItRoute", () => {
	it("matches the IT dashboard and its subpages", () => {
		expect(isItRoute("/dashboard/it")).toBe(true);
		expect(isItRoute("/dashboard/it/incidents/active")).toBe(true);
	});

	it("matches the ticket queue and detail but not new-ticket intake", () => {
		expect(isItRoute("/tickets")).toBe(true);
		expect(isItRoute("/tickets/abc123")).toBe(true);
		expect(isItRoute("/tickets/new")).toBe(false);
	});

	it("leaves other pages alone", () => {
		expect(isItRoute("/dashboard")).toBe(false);
		expect(isItRoute("/dashboard/itinerary")).toBe(false);
		expect(isItRoute(null)).toBe(false);
	});
});
