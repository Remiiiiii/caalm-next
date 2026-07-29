"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { mutateStorageUsage } from "@/hooks/useStorageUsage";

export async function refreshStorageUsage(
	router?: Pick<AppRouterInstance, "refresh">,
) {
	await mutateStorageUsage();
	router?.refresh();
}
