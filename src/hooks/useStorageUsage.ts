"use client";

import useSWR, { mutate } from "swr";
import {
	STORAGE_USAGE_SWR_KEY,
	type StorageUsagePayload,
} from "@/lib/storage/storageUsage.types";

type StorageUsageFetcherError = Error & { status?: number };

async function fetchStorageUsage(): Promise<StorageUsagePayload> {
	const res = await fetch(STORAGE_USAGE_SWR_KEY, {
		cache: "no-store",
		credentials: "same-origin",
	});

	if (!res.ok) {
		let message = "Failed to fetch storage usage";
		try {
			const body = (await res.json()) as { error?: string; message?: string };
			message = body.error || body.message || message;
		} catch {
			// keep default message
		}
		const error = new Error(message) as StorageUsageFetcherError;
		error.status = res.status;
		throw error;
	}

	return res.json() as Promise<StorageUsagePayload>;
}

export function useStorageUsage() {
	const {
		data,
		error,
		isLoading,
		mutate: localMutate,
	} = useSWR(STORAGE_USAGE_SWR_KEY, fetchStorageUsage, {
		refreshInterval: 15000,
		revalidateOnFocus: true,
		dedupingInterval: 5000,
		// Auth/permission misses are expected during session settle — don't hammer the API
		shouldRetryOnError: (err: StorageUsageFetcherError) => {
			const status = err?.status;
			if (typeof status === "number" && status >= 400 && status < 500) {
				return false;
			}
			return true;
		},
	});

	return {
		totalSpace: data ?? null,
		limitBytes: data?.limitBytes ?? null,
		limitGB: data?.limitGB ?? null,
		isLoading,
		error,
		refresh: localMutate,
	};
}

export async function mutateStorageUsage() {
	return mutate(STORAGE_USAGE_SWR_KEY, fetchStorageUsage, {
		revalidate: true,
		populateCache: true,
	});
}
