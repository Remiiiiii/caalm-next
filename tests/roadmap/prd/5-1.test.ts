import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 5.1 replace or label the IT dashboard API", () => {
	it("dashboard API has no hard-coded fake metric arrays", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/it/dashboard/route.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/Mock data for now/);
		expect(source).not.toMatch(/apiRequests:\s*125000/);
		expect(source).not.toMatch(/uptime:\s*99\.9/);
		expect(source).toMatch(/telemetryConfigured:\s*false/);
		expect(source).toMatch(/probeAppwrite|createAdminClient/);
		expect(source).toMatch(/notice/);
	});

	it("SSE metrics stream does not emit Math.random host graphs", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/it/metrics/sse/route.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/Math\.random/);
		expect(source).toMatch(/configured:\s*false/);
	});

	it("IT dashboard UI explains missing telemetry", () => {
		const source = readFileSync(
			join(process.cwd(), "src/components/ITDashboard.tsx"),
			"utf8",
		);
		expect(source).toMatch(/Not configured|telemetryConfigured|notice/);
		expect(source).toMatch(/SampleDataBadge/);
	});
});
