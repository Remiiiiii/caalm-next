"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type {
	ApprovalDecision,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { useApprovalWorkflowRealtime } from "@/hooks/useApprovalWorkflowRealtime";

async function fetchWorkflow(
	url: string,
): Promise<ApprovalWorkflowViewerPayload> {
	const res = await fetch(url);
	const json = await res.json();
	if (!res.ok || !json.success) {
		throw new Error(
			toUserFacingErrorMessage(
				json.error,
				"Could not load the approval workflow. Please try again.",
			),
		);
	}
	return json.data as ApprovalWorkflowViewerPayload;
}

function actionError(json: { error?: string }, fallback: string): Error {
	return new Error(toUserFacingErrorMessage(json.error, fallback));
}

export function useLicenseApprovalWorkflow(licenseId: string | null) {
	const key = licenseId ? `/api/licenses/${licenseId}/approval-workflow` : null;

	const { data, error, isLoading, mutate } = useSWR(key, fetchWorkflow, {
		revalidateOnFocus: false,
	});

	useApprovalWorkflowRealtime("license", licenseId);

	const decide = useCallback(
		async ({
			decision,
			notes,
			path,
		}: {
			decision: ApprovalDecision;
			notes?: string;
			path?: string;
		}) => {
			if (!licenseId) {
				throw new Error("This license could not be found. Refresh and try again.");
			}
			const res = await fetch(
				`/api/licenses/${licenseId}/approval-workflow/decide`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ decision, notes, path }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw actionError(json, "Could not record your decision. Please try again.");
			}
			await mutate(json.data, false);
			return json.data as ApprovalWorkflowViewerPayload;
		},
		[licenseId, mutate],
	);

	const reassign = useCallback(
		async ({
			assigneeUserIds,
			reason,
			path,
		}: {
			assigneeUserIds: string[];
			reason: string;
			path?: string;
		}) => {
			if (!licenseId) {
				throw new Error("This license could not be found. Refresh and try again.");
			}
			const res = await fetch(
				`/api/licenses/${licenseId}/approval-workflow/reassign`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ assigneeUserIds, reason, path }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw actionError(json, "Could not reassign this step. Please try again.");
			}
			await mutate(json.data, false);
			return json.data as ApprovalWorkflowViewerPayload;
		},
		[licenseId, mutate],
	);

	const claim = useCallback(
		async ({ path }: { path?: string } = {}) => {
			if (!licenseId) {
				throw new Error("This license could not be found. Refresh and try again.");
			}
			const res = await fetch(
				`/api/licenses/${licenseId}/approval-workflow/claim`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ path }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw actionError(json, "Could not claim this step. Please try again.");
			}
			await mutate(json.data, false);
			return json.data as ApprovalWorkflowViewerPayload;
		},
		[licenseId, mutate],
	);

	const resubmit = useCallback(
		async ({ path }: { path?: string } = {}) => {
			if (!licenseId) {
				throw new Error("This license could not be found. Refresh and try again.");
			}
			const res = await fetch(
				`/api/licenses/${licenseId}/approval-workflow/resubmit`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ path }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw actionError(json, "Could not resubmit. Please try again.");
			}
			await mutate(json.data, false);
			return json.data as ApprovalWorkflowViewerPayload;
		},
		[licenseId, mutate],
	);

	return {
		workflow: data,
		error,
		isLoading,
		refresh: mutate,
		decide,
		reassign,
		resubmit,
		claim,
	};
}
