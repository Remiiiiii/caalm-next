"use client";

/**
 * Live-updates approval workflow dialogs when the underlying contract/license
 * row changes in Appwrite (decide, reassign, claim, resubmit, SLA stamps).
 *
 * Same pattern as useRoadmapRealtime: subscribe → debounce → SWR mutate.
 * No custom webhook required — workflow mutations already write approvalWorkflowState
 * onto the entity row.
 */

import type { RealtimeResponseEvent } from "appwrite";
import { Channel } from "appwrite";
import { useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { client } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";

const REFRESH_DEBOUNCE_MS = 300;

export type ApprovalWorkflowEntityType = "contract" | "license";

function isApprovalRealtimeAvailable(
	entityType: ApprovalWorkflowEntityType,
): boolean {
	const db = appwriteConfig.databaseId;
	const tableId =
		entityType === "contract"
			? appwriteConfig.contractsCollectionId
			: appwriteConfig.licensesCollectionId;
	return Boolean(
		appwriteConfig.endpointUrl &&
			appwriteConfig.projectId &&
			db &&
			tableId &&
			!String(db).startsWith("test-"),
	);
}

function entityRowChannel(
	entityType: ApprovalWorkflowEntityType,
	entityId: string,
): string {
	const tableId =
		entityType === "contract"
			? appwriteConfig.contractsCollectionId!
			: appwriteConfig.licensesCollectionId!;
	return Channel.tablesdb(appwriteConfig.databaseId!)
		.table(tableId)
		.row(entityId)
		.toString();
}

export function approvalWorkflowSwrKey(
	entityType: ApprovalWorkflowEntityType,
	entityId: string,
): string {
	return entityType === "contract"
		? `/api/contracts/${entityId}/approval-workflow`
		: `/api/licenses/${entityId}/approval-workflow`;
}

/**
 * While a workflow dialog/sheet is open for this entity, keep SWR in sync for
 * every viewer subscribed to the same row (assignees, admins, uploader).
 */
export function useApprovalWorkflowRealtime(
	entityType: ApprovalWorkflowEntityType,
	entityId: string | null,
) {
	const { mutate } = useSWRConfig();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const realtimeEnabled =
		Boolean(entityId) && isApprovalRealtimeAvailable(entityType);

	const refreshWorkflow = useCallback(async () => {
		if (!entityId) return;
		const key = approvalWorkflowSwrKey(entityType, entityId);
		await mutate(key);
		// Keep the approvals queue in sync for anyone with that list open.
		await mutate(
			(swrKey) =>
				typeof swrKey === "string" && swrKey.startsWith("/api/approvals"),
			undefined,
			{ revalidate: true },
		);
	}, [entityId, entityType, mutate]);

	const scheduleRefresh = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void refreshWorkflow();
		}, REFRESH_DEBOUNCE_MS);
	}, [refreshWorkflow]);

	useEffect(() => {
		if (!realtimeEnabled || !entityId) return;

		const channel = entityRowChannel(entityType, entityId);
		const unsubscribe = client.subscribe(
			channel,
			(_event: RealtimeResponseEvent<Record<string, unknown>>) => {
				scheduleRefresh();
			},
		);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			try {
				unsubscribe();
			} catch {
				// Appwrite client may already be torn down
			}
		};
	}, [entityId, entityType, realtimeEnabled, scheduleRefresh]);

	return { realtimeEnabled };
}
