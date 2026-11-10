import { describe, expect, it } from "vitest";
import {
	confirmingLabelFromPending,
	mapConfirmFactsToSummaryRows,
	resolveStepUpPrompt,
} from "@/lib/auth/step-up-prompt";

describe("resolveStepUpPrompt", () => {
	it("fills brand defaults when prompt is omitted", () => {
		const resolved = resolveStepUpPrompt();
		expect(resolved.tone).toBe("brand");
		expect(resolved.title).toBe("Confirm with a code");
		expect(resolved.confirmLabel).toBe("Confirm with code");
		expect(resolved.summaryRows).toEqual([]);
	});

	it("keeps caller title and confirm label", () => {
		const resolved = resolveStepUpPrompt({
			tone: "danger",
			title: "Revoke this invitation",
			confirmLabel: "Revoke invitation",
		});
		expect(resolved.tone).toBe("danger");
		expect(resolved.title).toBe("Revoke this invitation");
		expect(resolved.confirmLabel).toBe("Revoke invitation");
	});

	it("names the destination email in the default description", () => {
		const resolved = resolveStepUpPrompt(undefined, "ada@example.com");
		expect(resolved.description).toContain("ada@example.com");
	});
});

describe("mapConfirmFactsToSummaryRows", () => {
	it("puts the action first as the lead row", () => {
		const rows = mapConfirmFactsToSummaryRows({
			confirmLabel: "Revoke invitation",
			facts: [
				{ label: "Email", value: "j.okafor@example.com" },
				{ label: "Date", value: "11/9/2026" },
			],
		});
		expect(rows[0]).toEqual({
			label: "Action",
			value: "Revoke invitation",
			lead: true,
		});
		expect(rows.map((row) => row.label)).toEqual(["Action", "Email", "Date"]);
	});

	it("omits empty fact values", () => {
		const rows = mapConfirmFactsToSummaryRows({
			confirmLabel: "Delete role",
			facts: [
				{ label: "Role", value: "Viewer" },
				{ label: "Note", value: "   " },
				{ label: "Skip", value: null },
			],
		});
		expect(rows.map((row) => row.label)).toEqual(["Action", "Role"]);
	});
});

describe("confirmingLabelFromPending", () => {
	it("strips trailing ellipsis from pending labels", () => {
		expect(confirmingLabelFromPending("Revoking…")).toBe("Revoking");
		expect(confirmingLabelFromPending("Deleting...")).toBe("Deleting");
	});
});
