import { describe, expect, it } from "vitest";
import { buildAuditProgress } from "@/lib/audit-upload/progress-steps";
import type { ProcessingLogEntry } from "@/lib/audit-upload/types";

function entry(
	stage: string,
	status: ProcessingLogEntry["status"],
	message?: string,
): ProcessingLogEntry {
	return { at: "2026-01-01T00:00:00.000Z", stage, status, message };
}

describe("buildAuditProgress", () => {
	it("marks upload complete and extract active from the log", () => {
		const { steps, percent } = buildAuditProgress(
			[
				entry("upload", "complete"),
				entry("extract", "started"),
			],
			{ uploadComplete: true },
		);
		expect(steps[0]?.state).toBe("done");
		expect(steps[1]?.state).toBe("active");
		expect(steps[2]?.state).toBe("pending");
		expect(percent).toBe(17);
	});

	it("appends chunk count and classification to labels", () => {
		const { steps, percent } = buildAuditProgress([
			entry("upload", "complete"),
			entry("extract", "complete", "9 chunks"),
			entry("classify", "complete", "compliance"),
			entry("extract_findings", "started"),
		]);
		expect(steps[1]?.label).toBe("Extract · 9 chunks");
		expect(steps[2]?.label).toBe("Classify · compliance");
		expect(steps[3]?.state).toBe("active");
		expect(percent).toBe(50);
	});

	it("marks the active step failed and leaves later steps pending", () => {
		const { steps, percent } = buildAuditProgress(
			[
				entry("upload", "complete"),
				entry("extract", "complete", "4 chunks"),
				entry("classify", "started"),
			],
			{ failed: true },
		);
		expect(steps[2]?.state).toBe("failed");
		expect(steps[3]?.state).toBe("pending");
		expect(percent).toBe(33);
	});
});
