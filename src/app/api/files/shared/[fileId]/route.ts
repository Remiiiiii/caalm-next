import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { constructFileUrl } from "@/lib/utils";

/**
 * Load a file the current user owns or was shared with (users[] contains their email).
 */
export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ fileId: string }> },
) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const { fileId } = await context.params;
		if (!fileId) {
			return NextResponse.json({ error: "fileId is required" }, { status: 400 });
		}

		const { tablesDB } = await createAdminClient();
		const fileDoc = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.filesCollectionId!,
			rowId: fileId,
		});

		const ownerId =
			typeof fileDoc.owner === "string"
				? fileDoc.owner
				: (fileDoc.owner as { $id?: string } | undefined)?.$id;
		const sharedEmails = Array.isArray(fileDoc.users)
			? (fileDoc.users as string[]).map((e) => String(e).trim().toLowerCase())
			: [];
		const userEmail = String(user.email || "").trim().toLowerCase();
		const isOwner = ownerId === user.$id || ownerId === user.accountId;
		const isShared = userEmail.length > 0 && sharedEmails.includes(userEmail);

		if (!isOwner && !isShared) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const bucketFileId = fileDoc.bucketFileId
			? String(fileDoc.bucketFileId)
			: "";
		const url =
			(fileDoc.url && String(fileDoc.url)) ||
			(bucketFileId ? constructFileUrl(bucketFileId) : "");

		return NextResponse.json({
			$id: fileDoc.$id,
			name: fileDoc.name || fileDoc.contractName || "Document",
			type: fileDoc.type || fileDoc.extension || "document",
			extension: fileDoc.extension || "",
			size: fileDoc.size ?? 0,
			bucketFileId: bucketFileId || null,
			url,
			$createdAt: fileDoc.$createdAt,
			contractExpiryDate: fileDoc.contractExpiryDate || null,
			description: fileDoc.description || "",
			owner: ownerId || null,
		});
	} catch (error) {
		console.error("[GET /api/files/shared/[fileId]]", error);
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}
}
