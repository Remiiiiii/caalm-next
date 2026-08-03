"use client";

import useSWR, { mutate } from "swr";
import {
	STORAGE_USAGE_SWR_KEY,
	type StorageUsagePayload,
} from "@/lib/storage/storageUsage.types";

async function fetchStorageUsage(): Promise<StorageUsagePayload> {
	const res = await fetch(STORAGE_USAGE_SWR_KEY, { cache: "no-store" });
	if (!res.ok) {
		throw new Error("Failed to fetch storage usage");
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
