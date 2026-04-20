"use client";

import useSWR from "swr";
import type { UIFileDoc } from "@/types/files";

interface ContractsResponse {
	success?: boolean;
	data?: UIFileDoc[];
	requestId?: string;
	error?: string;
}

const fetcher = async (url: string): Promise<UIFileDoc[]> => {
	try {
		console.log("[useContractsExpiring] Fetching from:", url);
		const response = await fetch(url);

		console.log("[useContractsExpiring] Response status:", {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[useContractsExpiring] API error:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});
			throw new Error(`Failed to fetch contracts: ${response.statusText}`);
		}

		const rawResult = await response.json();
		console.log("[useContractsExpiring] Raw API response:", {
			keys: Object.keys(rawResult),
			hasSuccess: "success" in rawResult,
			hasData: "data" in rawResult,
			successValue: rawResult.success,
			dataType: typeof rawResult.data,
			dataIsArray: Array.isArray(rawResult.data),
			dataLength: Array.isArray(rawResult.data)
				? rawResult.data.length
				: "not array",
			fullResponse: rawResult,
		});

		const result: ContractsResponse = rawResult;

		// Handle both response formats: { success: true, data: [...] } and { data: [...] }
		if (result.success === false || result.error) {
			console.error("[useContractsExpiring] API returned error:", result.error);
			throw new Error(result.error || "Failed to fetch contracts");
		}

		// Extract contracts array - handle multiple possible formats
		let contracts: UIFileDoc[] = [];

		if (Array.isArray(result.data)) {
			// Standard format: { success: true, data: [...] }
			contracts = result.data;
		} else if (Array.isArray(result)) {
			// Response is directly an array
			contracts = result as unknown as UIFileDoc[];
		} else if (
			result.data &&
			typeof result.data === "object" &&
			"rows" in result.data
		) {
			// Appwrite format: { data: { rows: [...] } }
			contracts = (result.data as any).rows || [];
		} else {
			console.warn(
				"[useContractsExpiring] Unexpected response format, returning empty array:",
				{
					resultType: typeof result,
					resultKeys: Object.keys(result),
					result,
				},
			);
			contracts = [];
		}

		console.log("[useContractsExpiring] Returning contracts:", {
			count: contracts.length,
			firstContract: contracts[0] || null,
		});

		return contracts;
	} catch (error) {
		console.error("[useContractsExpiring] Fetcher error:", error);
		throw error;
	}
};

/**
 * Hook to fetch contracts from /api/contracts/all endpoint
 */
export function useContractsExpiring() {
	const { data, error, isLoading, mutate } = useSWR<UIFileDoc[]>(
		"/api/contracts/all",
		fetcher,
		{
			refreshInterval: 300000, // Refresh every 5 minutes
			revalidateOnFocus: false,
			revalidateOnMount: true, // Always revalidate when component mounts
			revalidateOnReconnect: true,
			dedupingInterval: 60000, // Dedupe requests within 1 minute
			errorRetryCount: 2,
			errorRetryInterval: 3000,
			// Add cache control to prevent stale data
			keepPreviousData: false,
		},
	);

	// Debug logging in development
	if (process.env.NODE_ENV === "development") {
		console.log("[useContractsExpiring] Hook state:", {
			dataType: typeof data,
			dataIsArray: Array.isArray(data),
			dataLength: Array.isArray(data) ? data.length : "not array",
			isLoading,
			hasError: !!error,
			error: error?.message || error,
			dataKeys: data && typeof data === "object" ? Object.keys(data) : [],
			dataValue: data,
		});
	}

	// Handle different data formats:
	// 1. If data is already an array, use it
	// 2. If data is an object with a 'data' property that's an array, extract it
	// 3. Otherwise, return empty array
	let contracts: UIFileDoc[] = [];
	if (Array.isArray(data)) {
		contracts = data;
	} else if (
		data &&
		typeof data === "object" &&
		"data" in data &&
		Array.isArray((data as any).data)
	) {
		contracts = (data as any).data;
		console.warn(
			"[useContractsExpiring] Data was wrapped in object, extracted array:",
			contracts.length,
		);
	} else if (data && typeof data === "object") {
		console.warn("[useContractsExpiring] Unexpected data format:", {
			type: typeof data,
			keys: Object.keys(data),
			data,
		});
	}

	return {
		contracts,
		isLoading,
		error,
		refresh: mutate,
	};
}
