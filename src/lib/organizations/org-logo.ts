/**
 * Optional company logo for organization letterheads on agreements.
 * Stored as settings.logoFileId (Appwrite file id in organization_logos bucket).
 * Client-safe helpers only — download/DOCX swap live in org-logo.server.ts.
 */

import { appwriteConfig } from "@/lib/appwrite/config";
import type { Organization } from "@/lib/rbac/organizations";

const ALLOWED_LOGO_MIME = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
]);

/** Max upload size: 5 MB */
export const ORG_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function isAllowedOrgLogoMime(mime: string): boolean {
	return ALLOWED_LOGO_MIME.has(mime.toLowerCase());
}

export function resolveOrgLogoFileId(
	settings: Organization["settings"] | undefined | null,
): string | null {
	const value = settings?.logoFileId;
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed || null;
}

/** Public view URL for an uploaded org logo, or null when not configured / missing. */
export function getOrgLogoUrl(
	logoFileId: string | null | undefined,
): string | null {
	if (!logoFileId?.trim()) return null;

	const endpoint =
		appwriteConfig.endpointUrl || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
	const bucketId =
		appwriteConfig.organizationLogosBucketId ||
		process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_LOGOS_BUCKET;
	const projectId =
		appwriteConfig.projectId || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

	if (!endpoint || !bucketId || !projectId) {
		console.warn("[org-logo] Organization logos bucket configuration missing");
		return null;
	}

	return `${endpoint}/storage/buckets/${bucketId}/files/${logoFileId.trim()}/view?project=${projectId}`;
}

export function getOrgLogoUrlFromSettings(
	settings: Organization["settings"] | undefined | null,
): string | null {
	return getOrgLogoUrl(resolveOrgLogoFileId(settings));
}
