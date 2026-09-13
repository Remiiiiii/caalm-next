"use client";

import { Clock3 } from "lucide-react";
import { isAssigneeMatch } from "@/lib/approvals/assigneeIdentity";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";

function joinNames(names: string[]): string {
	const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
	if (unique.length === 0) return "";
	if (unique.length === 1) return unique[0];
	if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
	return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

/** Plain-English “who / what” line for the current approval bottleneck. */
export function buildWaitingOnCopy(
	workflow: ApprovalWorkflowViewerPayload,
	entityLabel: "contract" | "license" = "contract",
): { title: string; detail: string } | null {
	if (workflow.workflowFrozen) return null;

	const status = workflow.contractStatus;
	if (status === "action-required" || workflow.canResubmit) {
		if (workflow.canResubmit) {
			return {
				title: "Waiting on you",
				detail: `Changes were requested. You need to update this ${entityLabel} and resubmit before review can continue.`,
			};
		}
		return {
			title: "Waiting on the submitter",
			detail: `Changes were requested. The uploader needs to update this ${entityLabel} and resubmit before review can continue.`,
		};
	}

	if (workflow.needsExecutiveAssignment) {
		return {
			title: "Waiting on an admin",
			detail:
				"No Executive role holder is assigned yet. An admin must assign someone to Executive approval before this item can go active.",
		};
	}

	const step =
		workflow.steps[workflow.currentStepIndex] ||
		workflow.steps.find((s) => s.status === "current");
	if (!step || step.status !== "current") return null;
	if (step.kind === "activated" || step.kind === "submitted") return null;

	const participants = step.participants || [];
	const waitingOnYou =
		participants.some((p) => p.isYou) ||
		isAssigneeMatch(step.assigneeUserIds, [workflow.viewerUserId]) ||
		workflow.canDecideAsAssignee;

	const allNames = joinNames(
		participants
			.map((p) => p.fullName)
			.filter((name) => name && name !== "Unknown user"),
	);
	const stepLabel = step.label || "the current step";
	const verb =
		step.kind === "executive_approval"
			? "approve (or request changes)"
			: "review and decide";

	if (waitingOnYou) {
		return {
			title: "Waiting on you",
			detail: `You need to ${verb} on “${stepLabel}” before this ${entityLabel} can move forward.`,
		};
	}

	if (!allNames) {
		return {
			title: `Waiting on ${stepLabel}`,
			detail: `This ${entityLabel} cannot proceed until someone is assigned and completes ${stepLabel}.`,
		};
	}

	const plural = allNames.includes(" and ") || allNames.includes(",");
	return {
		title: `Waiting on ${allNames}`,
		detail: `${allNames} ${plural ? "need" : "needs"} to ${verb} on “${stepLabel}” before this ${entityLabel} can move forward.`,
	};
}

export default function ApprovalWaitingBanner({
	workflow,
	entityLabel = "contract",
}: {
	workflow: ApprovalWorkflowViewerPayload;
	entityLabel?: "contract" | "license";
}) {
	const copy = buildWaitingOnCopy(workflow, entityLabel);
	if (!copy) return null;

	return (
		<div
			className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3"
			role="status"
		>
			<p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
				<Clock3 className="h-4 w-4 shrink-0 text-[#0f5384]" aria-hidden />
				{copy.title}
			</p>
			<p className="mt-1 ml-6 text-xs leading-relaxed text-slate-600">
				{copy.detail}
			</p>
		</div>
	);
}
