import { describe, expect, it } from "vitest";
import { emptyWizardPayload } from "./assemble-contract";
import {
	draftAgreementLabel,
	draftDisplayName,
	draftDisplayNameFromSummary,
	draftEditedAt,
	draftProgress,
	draftProgressFromSummary,
	isEmptyWizardDraft,
	isEmptyWizardDraftSummary,
} from "./wizard-draft-meta";
import type { WizardSession, WizardSessionSummary } from "@/types/contract-templates";

function session(overrides: Partial<WizardSession> = {}): WizardSession {
	return {
		$id: "sess1",
		$createdAt: new Date(Date.now() - 3_600_000).toISOString(),
		$updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
		orgId: "org1",
		userId: "user1",
		status: "in_progress",
		currentStep: 0,
		payload: emptyWizardPayload(),
		templateId: null,
		contractId: null,
		...overrides,
	};
}

describe("wizard draft metadata", () => {
	it("uses the typed contract name when present", () => {
		expect(
			draftDisplayName({ ...emptyWizardPayload().intake, contractName: "Acme vendor renewal" }),
		).toBe("Acme vendor renewal");
	});

	it("falls back to Untitled draft when the name is blank", () => {
		expect(draftDisplayName(emptyWizardPayload().intake)).toBe("Untitled draft");
	});

	it("labels missing blueprint as no agreement type chosen", () => {
		expect(draftAgreementLabel(null)).toBe("No agreement type chosen");
		expect(draftAgreementLabel("vendor")).toContain("Vendor");
	});

	it("marks never-started drafts as empty", () => {
		expect(isEmptyWizardDraft(session())).toBe(true);
		expect(
			isEmptyWizardDraft(
				session({
					payload: {
						...emptyWizardPayload(),
						blueprintId: "vendor",
					},
				}),
			),
		).toBe(false);
	});

	it("does not mark named drafts as empty", () => {
		const payload = emptyWizardPayload();
		payload.intake.contractName = "IT services contract";
		expect(isEmptyWizardDraft(session({ payload }))).toBe(false);
	});

	it("formats recent edits as hours ago", () => {
		const edited = draftEditedAt(
			session({
				$updatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
			}),
		);
		expect(edited).toBe("2h ago");
	});

	it("marks summary rows as empty when never started", () => {
		const summary: WizardSessionSummary = {
			$id: "sess1",
			$createdAt: new Date().toISOString(),
			$updatedAt: new Date().toISOString(),
			currentStep: 0,
			contractName: "",
			blueprintId: null,
			templateId: null,
			lastSavedAt: null,
			fillPercent: 0,
		};
		expect(isEmptyWizardDraftSummary(summary)).toBe(true);
		expect(
			isEmptyWizardDraftSummary({
				...summary,
				currentStep: 2,
			}),
		).toBe(true);
		expect(
			isEmptyWizardDraftSummary({
				...summary,
				blueprintId: "vendor",
			}),
		).toBe(false);
		expect(
			isEmptyWizardDraftSummary({
				...summary,
				templateId: "tmpl1",
			}),
		).toBe(false);
		expect(draftDisplayNameFromSummary(summary)).toBe("Untitled draft");
	});

	it("measures draft progress by wizard step, not filled fields", () => {
		const payload = emptyWizardPayload();
		payload.blueprintId = "government";
		payload.intake.contractName = "Acme Support Services";
		payload.intake.counterparty = "Acme";
		payload.intake.startDate = "2026-09-01";
		payload.intake.expiryDate = "2027-09-01";
		payload.intake.amount = "10000";

		expect(
			draftProgress(session({ payload, currentStep: 1 })),
		).toEqual({ percent: 33, label: "33% complete" });
		expect(
			draftProgress(session({ payload, currentStep: 2 })),
		).toEqual({ percent: 67, label: "67% complete" });
		expect(
			draftProgress(session({ payload, currentStep: 3 })),
		).toEqual({ percent: 100, label: "100% complete" });

		const summary: WizardSessionSummary = {
			$id: "sess1",
			$createdAt: new Date().toISOString(),
			$updatedAt: new Date().toISOString(),
			currentStep: 1,
			contractName: "Acme Support Services",
			blueprintId: "government",
			templateId: null,
			lastSavedAt: null,
			fillPercent: 100,
		};
		expect(draftProgressFromSummary(summary)).toEqual({
			percent: 33,
			label: "33% complete",
		});
		expect(draftProgressFromSummary({ ...summary, currentStep: 0 })).toEqual({
			percent: 0,
			label: "Not started",
		});
	});
});
