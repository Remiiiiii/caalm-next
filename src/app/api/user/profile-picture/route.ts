import { type NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Storage } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import CacheManager from "@/lib/services/cache-manager";

const client = new Client()
	.setEndpoint(appwriteConfig.endpointUrl!)
	.setProject(appwriteConfig.projectId!)
	.setKey(appwriteConfig.secretKey!);

const storage = new Storage(client);
const databases = new Databases(client);

export async function POST(request: NextRequest) {
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

			if (user.profileImageId) {
				await storage.deleteFile(
					appwriteConfig.profilePicturesBucketId!,
					user.profileImageId,
				);
			}
		} catch (_error) {
			// User might not exist or no existing profile picture - continue with upload
		}

		// Upload new file
		const uploadedFile = await storage.createFile(
			appwriteConfig.profilePicturesBucketId!,
			ID.unique(),
			file,
		);

		// Get user data for cache invalidation
		const userDoc = await databases.getDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
		);

		// Update user document with only the file ID (not the URL)
		await databases.updateDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
			{
				profileImageId: uploadedFile.$id,
			},
		);

		// Invalidate user cache to ensure updated profile picture is reflected
		await CacheManager.invalidateUsers(
			userDoc.email,
			userId,
			userDoc.accountId,
			userDoc.fullName,
		);

		// Generate file URL for response - construct manually like elsewhere in codebase
		const endpoint = appwriteConfig.endpointUrl!;
		const bucketId = appwriteConfig.profilePicturesBucketId!;
		const projectId = appwriteConfig.projectId!;
		const imageUrl = `${endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${projectId}`;

		return NextResponse.json({
			success: true,
			imageUrl,
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
	try {
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		// Get user document to find profile image ID
		const user = await databases.getDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.usersCollectionId!,
			userId,
		);

		if (user.profileImageId) {
			// Delete file from storage
			await storage.deleteFile(
				appwriteConfig.profilePicturesBucketId!,
				user.profileImageId,
			);

			// Get user data for cache invalidation before update
			const userDoc = user;

			// Update user document to remove profile image ID
			await databases.updateDocument(
				appwriteConfig.databaseId!,
				appwriteConfig.usersCollectionId!,
				userId,
				{
					profileImageId: null,
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
