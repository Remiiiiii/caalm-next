/**
 * Server-only org logo helpers (storage download + DOCX letterhead swap).
 */

import PizZip from "pizzip";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	resolveOrgLogoFileId,
} from "@/lib/organizations/org-logo";
import type { Organization } from "@/lib/rbac/organizations";

/** Download logo bytes from Appwrite storage. */
export async function downloadOrgLogoBytes(
	logoFileId: string,
): Promise<Buffer | null> {
	const bucketId = appwriteConfig.organizationLogosBucketId;
	if (!bucketId || !logoFileId.trim()) return null;

	try {
		const { storage } = await createAdminClient();
		const arrayBuffer = await storage.getFileDownload({
			bucketId,
			fileId: logoFileId.trim(),
		});
		return Buffer.from(arrayBuffer);
	} catch (error) {
		console.warn("[SERVER] downloadOrgLogoBytes:", error);
		return null;
	}
}

/**
 * Swap the first embedded image in a DOCX (usually the letterhead logo)
 * with the organization logo bytes. Keeps the original media path/name.
 */
export function replaceFirstDocxImage(
	docx: Buffer,
	imageBytes: Buffer,
): Buffer {
	if (!imageBytes.length) return docx;
	const zip = new PizZip(docx);
	const mediaNames = Object.keys(zip.files)
		.filter(
			(name) =>
				name.startsWith("word/media/") &&
				!zip.files[name].dir &&
				/\.(png|jpe?g|gif|webp|emf|wmf)$/i.test(name),
		)
		.sort();
	if (mediaNames.length === 0) return docx;
	zip.file(mediaNames[0], imageBytes);
	return zip.generate({ type: "nodebuffer" });
}

/** Apply optional org logo onto a merged agreement DOCX when present. */
export async function applyOrgLogoToDocx(
	docx: Buffer,
	settings: Organization["settings"] | undefined | null,
): Promise<Buffer> {
	const logoFileId = resolveOrgLogoFileId(settings);
	if (!logoFileId) return docx;
	const bytes = await downloadOrgLogoBytes(logoFileId);
	if (!bytes) return docx;
	return replaceFirstDocxImage(docx, bytes);
}
