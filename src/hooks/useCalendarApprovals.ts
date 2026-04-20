import useSWR from "swr";
import type { CalendarApprovalStatus } from "@/constants/rbac";
import type { CalendarApprovalRequest } from "@/lib/actions/calendar-approval.actions";
import { swrConfig } from "@/lib/swr-config";

interface UseCalendarApprovalsOptions {
	status?: CalendarApprovalStatus;
	enabled?: boolean;
}

export const useCalendarApprovals = ({
	status = "pending",
	enabled = true,
}: UseCalendarApprovalsOptions = {}) => {
	const key = enabled ? ["/api/approvals", status] : null;

	const { data, error, isLoading, mutate } = useSWR<{
		data: CalendarApprovalRequest[];
		total: number;
	}>(
		key,
		async ([url, approvalStatus]) => {
			try {
				const response = await fetch(`${url}?status=${approvalStatus}`, {
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (response.status === 401 || response.status === 403) {
					// User is not authenticated or lacks permissions; return empty data gracefully
					return {
						data: [],
						total: 0,
					};
				}

				if (!response.ok) {
					console.warn("Failed to load approvals", {
						status: response.status,
						statusText: response.statusText,
					});
					return {
						data: [],
						total: 0,
					};
				}

				return response.json();
			} catch (err) {
				console.error("Error fetching approvals:", err);
				return {
					data: [],
					total: 0,
				};
			}
		},
		{
			...swrConfig,
			revalidateOnFocus: true,
			// Automatically refresh every 10 seconds to catch new pending approvals
			refreshInterval: enabled && status === "pending" ? 10000 : 0,
			// Dedupe requests within 5 seconds to avoid excessive polling
			dedupingInterval: 5000,
		},
	);

	return {
		approvals: data?.data ?? [],
		total: data?.total ?? 0,
		isLoading: enabled ? isLoading : false,
		error: enabled ? error : null,
		refresh: mutate,
	};
};
