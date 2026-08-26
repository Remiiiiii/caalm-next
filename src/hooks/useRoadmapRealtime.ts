"use client";

/**
 * Subscribes to Appwrite Realtime on roadmap tables so CI webhooks
 * (which write rows in Appwrite) trigger immediate SWR revalidation.
 */

import type { RealtimeResponseEvent } from "appwrite";
import { Channel } from "appwrite";
import { useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { client } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";
import { fetcher } from "@/lib/swr-config";

const ROADMAP_OVERVIEW_KEY = "/api/roadmap/overview";
const REFRESH_DEBOUNCE_MS = 250;

function isRoadmapRealtimeAvailable(): boolean {
	const db = appwriteConfig.databaseId;
	const sections = appwriteConfig.roadmapSectionsCollectionId;
	const tasks = appwriteConfig.roadmapTasksCollectionId;
	return Boolean(
		appwriteConfig.endpointUrl &&
			appwriteConfig.projectId &&
			db &&
			sections &&
			tasks &&
			!db.startsWith("test-"),
	);
}

function roadmapTableChannel(tableId: string): string {
	return Channel.tablesdb(appwriteConfig.databaseId!)
		.table(tableId)
		.row()
		.toString();
}

export function useRoadmapRealtime() {
	const { mutate } = useSWRConfig();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const realtimeEnabled = isRoadmapRealtimeAvailable();

	const refreshRoadmap = useCallback(async () => {
		// Overview has a short server cache — bypass with ?fresh=1
		await mutate(
			ROADMAP_OVERVIEW_KEY,
			() => fetcher(`${ROADMAP_OVERVIEW_KEY}?fresh=1`),
			{ revalidate: false },
		);

		// Revalidate expanded section detail keys (tasks / PRs)
		await mutate(
			(key) =>
				typeof key === "string" && key.startsWith("/api/roadmap/sections/"),
			undefined,
			{ revalidate: true },
		);
	}, [mutate]);

	const scheduleRefresh = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void refreshRoadmap();
		}, REFRESH_DEBOUNCE_MS);
	}, [refreshRoadmap]);

	useEffect(() => {
		if (!realtimeEnabled) return;

		const channels = [
			roadmapTableChannel(appwriteConfig.roadmapSectionsCollectionId!),
			roadmapTableChannel(appwriteConfig.roadmapTasksCollectionId!),
		];
		const testRuns = appwriteConfig.roadmapTestRunsCollectionId;
		if (testRuns) {
			channels.push(roadmapTableChannel(testRuns));
		}

		const unsubscribe = client.subscribe(
			channels,
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
	}, [realtimeEnabled, scheduleRefresh]);

	return { realtimeEnabled };
}
