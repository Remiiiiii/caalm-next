"use client";

import { useOrganization } from "@/contexts/OrganizationContext";
import { resolveOrgTimezone } from "@/lib/timezone";

export function useOrgTimezone(): string {
	const { timezone } = useOrganization();
	return resolveOrgTimezone(timezone);
}
