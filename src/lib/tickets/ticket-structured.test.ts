import { describe, expect, it } from "vitest";
import { composeEngineeringBugDescription } from "./bug-report-body";
import { getStructuredBody } from "./ticket-structured";

const base = { description: "Printer is broken" };

describe("getStructuredBody", () => {
	it("is null for plain Help tickets", () => {
		expect(getStructuredBody(base)).toBeNull();
	});

	it("prefers stored columns over the description", () => {
		const body = getStructuredBody({
			...base,
			stepsToReproduce: "1. Open\n2. Click",
			expectedBehavior: "Works",
			actualBehavior: "Fails",
			os: "macOS",
			environment: "Production",
			confirmedNoDuplicate: true,
			confirmedProductBug: false,
		});
		expect(body?.steps).toEqual(["Open", "Click"]);
		expect(body?.os).toBe("macOS");
		expect(body?.confirmations.map((c) => c.checked)).toEqual([true, false]);
	});

	it("falls back to parsing the description for legacy rows", () => {
		const description = composeEngineeringBugDescription({
			steps: "Do a thing now",
			expected: "It works fine",
			actual: "It breaks hard",
			os: "Linux",
			environment: "Local",
			searchedExisting: true,
			isBug: true,
		});
		expect(getStructuredBody({ description })?.os).toBe("Linux");
	});
});
