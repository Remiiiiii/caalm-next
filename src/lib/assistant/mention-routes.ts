import {
	hasNavigationPermission,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import type { PermissionKey } from "@/constants/permissions";

export type AssistantMentionRoute = {
	label: string;
	href: string;
};

export function mentionableRoutes(
	permissions: PermissionKey[],
): AssistantMentionRoute[] {
	const seen = new Set<string>();
	const routes: AssistantMentionRoute[] = [];
	for (const section of PERMISSION_BASED_NAV) {
		for (const item of section.items) {
			if (!item.url || item.url === "#") continue;
			if (!hasNavigationPermission(permissions, item)) continue;
			if (seen.has(item.url)) continue;
			seen.add(item.url);
			routes.push({ label: item.name, href: item.url });
		}
	}
	return routes;
}
