import { describe, expect, it } from "vitest";
import {
	composeEngineeringBugDescription,
	parseEngineeringBugDescription,
} from "./bug-report-body";

describe("parseEngineeringBugDescription", () => {
	it("round-trips a composed engineering description", () => {
		const description = composeEngineeringBugDescription({
			steps: "1. Open the module\n2. Click approve\n3. See the freeze",
			expected: "Approval completes",
			actual: "503 after 10 seconds",
			os: "macOS",
			environment: "Production",
			searchedExisting: true,
			isBug: false,
			extra: "Happens daily",
		});
		const parsed = parseEngineeringBugDescription(description);
		expect(parsed?.steps).toEqual([
			"Open the module",
			"Click approve",
			"See the freeze",
		]);
		expect(parsed?.expected).toBe("Approval completes");
		expect(parsed?.actual).toBe("503 after 10 seconds");
		expect(parsed?.os).toBe("macOS");
		expect(parsed?.environment).toBe("Production");
		expect(parsed?.extra).toBe("Happens daily");
		expect(parsed?.confirmations.map((c) => c.checked)).toEqual([true, false]);
	});

	it("returns null for free-text descriptions", () => {
		expect(parseEngineeringBugDescription("Printer is broken")).toBeNull();
	});
});
