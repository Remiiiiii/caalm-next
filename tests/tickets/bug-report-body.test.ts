import { describe, expect, it } from "vitest";
import {
	BUG_CONFIRM_IS_BUG,
	BUG_CONFIRM_SEARCHED,
	BUG_REPORT_HEADINGS,
	composeEngineeringBugDescription,
	detectBugReportEnvironment,
	detectBugReportOs,
	parseEngineeringBugFields,
} from "@/lib/tickets/bug-report-body";

describe("composeEngineeringBugDescription", () => {
	it("uses the GitHub issue form headings", () => {
		const body = composeEngineeringBugDescription({
			steps: "1. Open licenses\n2. Filter by expired",
			expected: "Expired licenses should list.",
			actual: "The table stays empty.",
			os: "Windows",
			environment: "Local",
			searchedExisting: true,
			isBug: true,
		});
		expect(body).toContain(`### ${BUG_REPORT_HEADINGS.steps}`);
		expect(body).toContain(`### ${BUG_REPORT_HEADINGS.expected}`);
		expect(body).toContain(`### ${BUG_REPORT_HEADINGS.actual}`);
		expect(body).toContain(`### ${BUG_REPORT_HEADINGS.os}`);
		expect(body).toContain(`### ${BUG_REPORT_HEADINGS.environment}`);
		expect(body).toContain("1. Open licenses");
		expect(body).toContain(`- [x] ${BUG_CONFIRM_SEARCHED}`);
		expect(body).toContain(`- [x] ${BUG_CONFIRM_IS_BUG}`);
	});
});

describe("parseEngineeringBugFields", () => {
	it("rejects missing reproduction steps", () => {
		expect(() =>
			parseEngineeringBugFields({
				expected: "Save should work.",
				actual: "Save does nothing.",
				os: "Windows",
				environment: "Local",
				searchedExisting: true,
				isBug: true,
			}),
		).toThrow(/reproduction steps/i);
	});

	it("rejects missing confirmations", () => {
		expect(() =>
			parseEngineeringBugFields({
				steps: "1. Open contracts\n2. Click save",
				expected: "Save should work.",
				actual: "Save does nothing.",
				os: "Windows",
				environment: "Local",
			}),
		).toThrow(/confirmations/i);
	});
});

describe("detectBugReportOs", () => {
	it("detects Windows from the user agent", () => {
		expect(
			detectBugReportOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32"),
		).toBe("Windows");
	});

	it("detects macOS from the user agent", () => {
		expect(
			detectBugReportOs(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
				"MacIntel",
			),
		).toBe("macOS");
	});
});

describe("detectBugReportEnvironment", () => {
	it("maps localhost to Local", () => {
		expect(detectBugReportEnvironment("localhost")).toBe("Local");
	});

	it("maps Vercel preview hosts to Preview", () => {
		expect(detectBugReportEnvironment("caalm-next-git-main.vercel.app")).toBe(
			"Preview",
		);
	});

	it("maps production hosts to Production", () => {
		expect(detectBugReportEnvironment("app.caalm.com")).toBe("Production");
	});
});
