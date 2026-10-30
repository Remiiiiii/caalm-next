import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { parseByteRange } from "@/lib/tickets/byte-range";
import { getTicketById } from "@/lib/tickets/ticket.repository";
import { canViewTicket } from "@/lib/tickets/ticket-access.policy";
import {
	isVideoAttachment,
	ticketAttachmentsBucketId,
} from "@/lib/tickets/ticket-attachments";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ ticketId: string; fileId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.TICKETS.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const { ticketId, fileId } = await params;
	const ticket = await getTicketById(ticketId);
	if (!ticket) {
		return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	if (!canViewTicket(ticket, { userId: user.$id, permissions })) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	// Only files attached to this ticket, never an arbitrary bucket id.
	if (!ticket.attachments?.includes(fileId)) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	try {
		const { storage } = await createAdminClient();
		const bucketId = ticketAttachmentsBucketId();
		const meta = await storage.getFile({ bucketId, fileId });
		// shortcut: whole file is buffered to serve Range; uploads are capped at 10 MB, move to streaming if that grows.
		const buffer = Buffer.from(
			await storage.getFileDownload({ bucketId, fileId }),
		);

		const download = request.nextUrl.searchParams.get("download") === "1";
		const mimeType =
			isVideoAttachment(meta) && !meta.mimeType.startsWith("video/")
				? "video/webm"
				: meta.mimeType || "application/octet-stream";
		const safeName = meta.name.replace(/[^\w.\- ]/g, "_");
		const headers: Record<string, string> = {
			"Content-Type": mimeType,
			"Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
			"Accept-Ranges": "bytes",
			"Cache-Control": "private, max-age=300",
			"X-Content-Type-Options": "nosniff",
		};

		const range = parseByteRange(request.headers.get("range"), buffer.length);
		if (range) {
			const chunk = buffer.subarray(range.start, range.end + 1);
			return new NextResponse(new Uint8Array(chunk), {
				status: 206,
				headers: {
					...headers,
					"Content-Range": `bytes ${range.start}-${range.end}/${buffer.length}`,
					"Content-Length": String(chunk.length),
				},
			});
		}
		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: { ...headers, "Content-Length": String(buffer.length) },
		});
	} catch {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}
}
