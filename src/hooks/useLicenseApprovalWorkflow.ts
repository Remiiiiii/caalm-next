"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type {
	ApprovalDecision,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";

async function fetchWorkflow(
	url: string,
): Promise<ApprovalWorkflowViewerPayload> {
	const res = await fetch(url);
	const json = await res.json();
	if (!res.ok || !json.success) {
		throw new Error(json.error || "Failed to load approval workflow");
	}
	return json.data as ApprovalWorkflowViewerPayload;
}

export function useLicenseApprovalWorkflow(licenseId: string | null) {
	const key = licenseId
		? `/api/licenses/${licenseId}/approval-workflow`
		: null;

	const { data, error, isLoading, mutate } = useSWR(key, fetchWorkflow, {
		revalidateOnFocus: false,
	});

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
			if (!licenseId) throw new Error("Missing license id");
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
				throw new Error(json.error || "Failed to record decision");
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
	};
}
