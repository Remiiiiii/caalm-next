import { describe, expect, it } from "vitest";
import type { ApprovalWorkflowState } from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	getContractLifecycleDisplay,
	signatureHintFromEnvelope,
} from "@/lib/contracts/contractLifecycleDisplay";
import type { UIFileDoc } from "@/types/files";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function workflow(partial: Partial<ApprovalWorkflowState>): string {
	const state: ApprovalWorkflowState = {
		version: 1,
		currentStepIndex: 1,
		derivedAt: NOW.toISOString(),
		steps: [],
		notifications: [],
		...partial,
	};
	return JSON.stringify(state);
}

function file(overrides: Partial<UIFileDoc> = {}): UIFileDoc {
	return {
		$id: "c1",
		$createdAt: "2026-09-01T12:00:00.000Z",
		$updatedAt: "2026-09-08T12:00:00.000Z",
		$permissions: [],
		$collectionId: "contracts",
		$databaseId: "db",
		$sequence: 0,
		type: "document",
		extension: "pdf",
		url: "",
		name: "MSA",
		size: 1,
		owner: "u1",
		users: [],
		status: "pending-review",
		...overrides,
	};
}

describe("signatureHintFromEnvelope", () => {
	it("returns not_sent when there is no envelope", () => {
		expect(signatureHintFromEnvelope(null, "not_started").stage).toBe(
			"not_sent",
		);
	});

	it("returns sent when the envelope is out and nobody has signed", () => {
		expect(
			signatureHintFromEnvelope(
				{
					status: "sent",
					recipients: [
						{ role: "signer", status: "sent" },
						{ role: "signer", status: "sent" },
					],
				},
				"pending",
			).stage,
		).toBe("sent");
	});

	it("returns countersign when the envelope is partially signed", () => {
		const hint = signatureHintFromEnvelope(
			{
				status: "partially_signed",
				recipients: [
					{ role: "signer", status: "signed" },
					{ role: "signer", status: "sent" },
				],
			},
			"pending",
		);
		expect(hint.stage).toBe("countersign");
		expect(hint.signedCount).toBe(1);
		expect(hint.totalSigners).toBe(2);
	});
});

describe("getContractLifecycleDisplay", () => {
	it("counts completed decision steps as N of M approved", () => {
		const display = getContractLifecycleDisplay(
			file({
				approvalWorkflowState: workflow({
					currentStepIndex: 2,
					steps: [
						{
							id: "s0",
							kind: "submitted",
							label: "Submitted",
							assigneeUserIds: [],
							status: "complete",
						},
						{
							id: "s1",
							kind: "department_review",
							label: "Department review",
							assigneeUserIds: ["m1"],
							status: "complete",
						},
						{
							id: "s2",
							kind: "internal_approval",
							label: "Internal",
							assigneeUserIds: ["i1"],
							status: "current",
						},
						{
							id: "s3",
							kind: "executive_approval",
							label: "Executive",
							assigneeUserIds: ["e1"],
							status: "pending",
						},
						{
							id: "s4",
							kind: "activated",
							label: "Activated",
							assigneeUserIds: [],
							status: "pending",
						},
					],
				}),
			}),
			{ now: NOW },
		);
		expect(display.label).toBe("Pending Review");
		expect(display.subtext).toBe("1 of 3 approved");
		expect(display.clickable).toBe(true);
	});

	it("flags stuck when the current step started more than 3 days ago", () => {
		const display = getContractLifecycleDisplay(
			file({
				approvalWorkflowState: workflow({
					steps: [
						{
							id: "s0",
							kind: "submitted",
							label: "Submitted",
							assigneeUserIds: [],
							status: "complete",
						},
						{
							id: "s1",
							kind: "department_review",
							label: "Department review",
							assigneeUserIds: ["m1"],
							status: "current",
							startedAt: "2026-09-06T11:00:00.000Z",
						},
					],
				}),
			}),
			{ now: NOW },
		);
		expect(display.stuck).toBe(true);
	});

	it("flags stuck when SLA is at risk even under 3 days", () => {
		const display = getContractLifecycleDisplay(
			file({
				$updatedAt: "2026-09-10T08:00:00.000Z",
				approvalWorkflowState: workflow({
					steps: [
						{
							id: "s0",
							kind: "submitted",
							label: "Submitted",
							assigneeUserIds: [],
							status: "complete",
						},
						{
							id: "s1",
							kind: "department_review",
							label: "Department review",
							assigneeUserIds: ["m1"],
							status: "current",
							startedAt: "2026-09-10T08:00:00.000Z",
							slaStatus: "at_risk",
						},
					],
				}),
			}),
			{ now: NOW },
		);
		expect(display.stuck).toBe(true);
	});

	it("shows Pending Signature / Not sent when no envelope has gone out", () => {
		const display = getContractLifecycleDisplay(
			file({
				status: "pending-signature",
				digitalSignatureStatus: "not_started",
			}),
			{ now: NOW },
		);
		expect(display.label).toBe("Pending Signature");
		expect(display.subtext).toBe("Not sent");
		expect(display.key).toBe("pending-signature");
	});

	it("shows Pending Countersign as a display-only label", () => {
		const display = getContractLifecycleDisplay(
			file({
				status: "pending-signature",
				digitalSignatureStatus: "pending",
				signatureDisplay: {
					stage: "countersign",
					signedCount: 1,
					totalSigners: 2,
				},
			}),
			{ now: NOW },
		);
		expect(display.label).toBe("Pending Countersign");
		expect(display.subtext).toBe("1 of 2 signed");
		expect(display.key).toBe("pending-countersign");
	});

	it("keeps negotiation from becoming a workflow click target", () => {
		const display = getContractLifecycleDisplay(
			file({
				status: "pending-review",
				lifecycleStatus: "negotiation",
			}),
			{ now: NOW },
		);
		expect(display.label).toBe("Negotiation");
		expect(display.clickable).toBe(false);
	});
});
