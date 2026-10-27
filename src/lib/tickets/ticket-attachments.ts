import "server-only";

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isTicketScreenRecordingFile } from "@/lib/files/enterprise-file-formats";
import type { Ticket } from "./ticket.types";

export type TicketAttachmentInfo = {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	isVideo: boolean;
};

export function ticketAttachmentsBucketId(): string {
	return appwriteConfig.ticketAttachmentsBucketId || "ticket_attachments";
}

export function isVideoAttachment(file: {
	name: string;
	mimeType?: string;
}): boolean {
	return (
		isTicketScreenRecordingFile({ name: file.name }) ||
		Boolean(file.mimeType?.startsWith("video/"))
	);
}

/** Metadata for each attachment on a ticket. Missing files are skipped. */
export async function listTicketAttachments(
	ticket: Pick<Ticket, "attachments">,
): Promise<TicketAttachmentInfo[]> {
	const ids = Array.isArray(ticket.attachments) ? ticket.attachments : [];
	if (ids.length === 0) return [];

	const { storage } = await createAdminClient();
	const bucketId = ticketAttachmentsBucketId();
	const files = await Promise.all(
		ids.map(async (id): Promise<TicketAttachmentInfo | null> => {
			try {
				const meta = await storage.getFile({ bucketId, fileId: id });
				return {
					id,
					name: meta.name,
					mimeType: meta.mimeType,
					size: meta.sizeOriginal,
					isVideo: isVideoAttachment({
						name: meta.name,
						mimeType: meta.mimeType,
					}),
				};
			} catch {
				return null;
			}
		}),
	);
	return files.filter((file): file is TicketAttachmentInfo => file !== null);
}
