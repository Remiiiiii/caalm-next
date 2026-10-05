import useSWR from "swr";
import type { OrgITSnapshot } from "@/lib/it/org-it-snapshot";
import { swrConfig } from "@/lib/swr-config";

export type ITHubOverviewResponse = {
	success: boolean;
	data: OrgITSnapshot;
	isPlatformCrossOrg: boolean;
};

const fetcher = async (url: string): Promise<ITHubOverviewResponse> => {
	const response = await fetch(url);
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error || "Failed to load IT hub overview");
	}
	return response.json();
};

export function useITHubOverview(orgId: string | null) {
	const { data, error, isLoading, mutate } = useSWR(
		orgId
			? `/api/it/hub/overview?orgId=${encodeURIComponent(orgId)}`
			: null,
		fetcher,
		{
			...swrConfig,
			revalidateOnFocus: true,
		},
	);

	return {
		snapshot: data?.data ?? null,
		isPlatformCrossOrg: data?.isPlatformCrossOrg === true,
		isLoading,
		error: error ? error.message : null,
		refresh: () => mutate(),
	};
}
