import { type NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { appwriteConfig } from "@/lib/appwrite/config";
import CacheManager from "@/lib/services/cache-manager";
import {
	getProfilePictureUrl,
	resolveStoredAvatarFileId,
} from "@/lib/utils";

const client = new Client()
	.setEndpoint(appwriteConfig.endpointUrl!)
	.setProject(appwriteConfig.projectId!)
	.setKey(appwriteConfig.secretKey!);

const storage = new Storage(client);
const databases = new Databases(client);

const AVATAR_FILE_ID_RE = /^[A-Za-z0-9._-]{1,36}$/;

function toBuffer(fileContent: unknown): Buffer {
	if (Buffer.isBuffer(fileContent)) return fileContent;
	if (fileContent instanceof ArrayBuffer) return Buffer.from(fileContent);
	if (fileContent instanceof Uint8Array) return Buffer.from(fileContent);
	return Buffer.from(fileContent as ArrayBuffer);
}

export async function GET(request: NextRequest) {
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const fileId = request.nextUrl.searchParams.get("fileId")?.trim() || "";
	if (!AVATAR_FILE_ID_RE.test(fileId)) {
		return NextResponse.json({ error: "fileId is required" }, { status: 400 });
	}

	const bucketId = appwriteConfig.profilePicturesBucketId;
	if (!bucketId) {
		return NextResponse.json(
			{ error: "Storage configuration is missing" },
			{ status: 500 },
		);
	}

	try {
		const meta = await storage.getFile(bucketId, fileId);
		const fileContent = await storage.getFileDownload(bucketId, fileId);
		const buffer = toBuffer(fileContent);
		const contentType = meta.mimeType || "image/jpeg";

		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Length": String(buffer.length),
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (error) {
		console.error("[SERVER] profile-picture GET:", error);
		return NextResponse.json(
			{ error: "Profile picture not found" },
			{ status: 404 },
		);
	}
}

export async function POST(request: NextRequest) {
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	try {
		// Check if required Appwrite config is available
		if (
			!appwriteConfig.profilePicturesBucketId ||
			!appwriteConfig.databaseId ||
			!appwriteConfig.usersCollectionId
		) {
			return NextResponse.json(
				{
					error:
						"Storage configuration is missing. Please check environment variables.",
				},
				{ status: 500 },
			);
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;
		const userId = formData.get("userId") as string;

		if (!file || !userId) {
			return NextResponse.json(
				{ error: "File and userId are required" },
				{ status: 400 },
			);
		}

		if (userId !== currentUser.$id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			return NextResponse.json(
				{ error: "Only image files are allowed" },
				{ status: 400 },
			);
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json(
				{ error: "File size must be less than 5MB" },
				{ status: 400 },
			);
		}

		// Delete existing profile picture if it exists
		try {
			const user = await databases.getDocument(
				appwriteConfig.databaseId!,
				appwriteConfig.usersCollectionId!,
				userId,
			);

			const existingImageId = resolveStoredAvatarFileId(
				user as unknown as {
					avatar?: string | null;
					profileImageId?: string | null;
				},
			);
			if (existingImageId) {
				await storage.deleteFile(
					appwriteConfig.profilePicturesBucketId!,
					existingImageId,
				);
			}
		} catch (_error) {
			// User might not exist or no existing profile picture - continue with upload
		}

		const arrayBuffer = await file.arrayBuffer();
		const inputFile = InputFile.fromBuffer(
			Buffer.from(arrayBuffer),
			file.name || "profile-picture",
		);
		const uploadedFile = await storage.createFile(
			appwriteConfig.profilePicturesBucketId!,
			ID.unique(),
			inputFile,
		);

		// Get user data for cache invalidation
		const userDoc = await databases.getDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
		);

		// Store file ID in avatar field (text); profileImageId is deprecated.
		await databases.updateDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
			{
				avatar: uploadedFile.$id,
			},
		);

		// Invalidate user cache to ensure updated profile picture is reflected
		await CacheManager.invalidateUsers(
			userDoc.email,
			userId,
			userDoc.accountId,
			userDoc.fullName,
		);

		return NextResponse.json({
			success: true,
			imageUrl: getProfilePictureUrl(uploadedFile.$id),
			fileId: uploadedFile.$id,
		});
	} catch (error) {
		console.error("Profile picture upload error:", error);

		let errorMessage = "Failed to upload profile picture";
		if (error instanceof Error) {
			errorMessage = error.message;
		}

		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	try {
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		if (userId !== currentUser.$id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Get user document to find current profile image ID
		const user = await databases.getDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
		);

		const existingImageId = resolveStoredAvatarFileId(
			user as unknown as {
				avatar?: string | null;
				profileImageId?: string | null;
			},
		);
		if (existingImageId) {
			// Delete file from storage
			await storage.deleteFile(
				appwriteConfig.profilePicturesBucketId!,
				existingImageId,
			);

			// Get user data for cache invalidation before update
			const userDoc = user;

			// Clear avatar field (profileImageId is deprecated)
			await databases.updateDocument(
				appwriteConfig.databaseId!,
				appwriteConfig.usersCollectionId!,
				userId,
				{
					avatar: null,
				},
			);

			// Invalidate user cache to ensure updated profile picture is reflected
			await CacheManager.invalidateUsers(
				userDoc.email,
				userId,
				userDoc.accountId,
				userDoc.fullName,
			);
		}

		return NextResponse.json({
			success: true,
			message: "Profile picture deleted successfully",
		});
	} catch (error) {
		console.error("Profile picture delete error:", error);
		return NextResponse.json(
			{ error: "Failed to delete profile picture" },
			{ status: 500 },
		);
	}
}
