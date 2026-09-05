import { type NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import {
	createApiAdminClient,
	createApiSessionClient,
} from "@/lib/appwrite/api-client";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";
import { constructFileUrl, getFileType } from "@/lib/utils";
import {
	assertEnterpriseFileAllowed,
	EnterpriseFileFormatError,
} from "@/lib/files/enterprise-file-formats";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const userId = formData.get("userId") as string;
		const _department = formData.get("department") as string;
		const uploadId = formData.get("uploadId") as string;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Validate file size (50MB limit)
		const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File size exceeds 50MB limit" },
				{ status: 400 },
			);
		}

		try {
			assertEnterpriseFileAllowed(file, "attachment");
		} catch (error) {
			if (error instanceof EnterpriseFileFormatError) {
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
			throw error;
		}

		// Validate configuration
		if (!appwriteConfig.bucketId) {
			console.error("Missing bucketId configuration");
			return NextResponse.json(
				{ error: "Server configuration error: bucketId is missing" },
				{ status: 500 },
			);
		}

		if (!appwriteConfig.databaseId) {
			console.error("Missing databaseId configuration");
			return NextResponse.json(
				{ error: "Server configuration error: databaseId is missing" },
				{ status: 500 },
			);
		}

		if (!appwriteConfig.filesCollectionId) {
			console.error("Missing filesCollectionId configuration");
			return NextResponse.json(
				{ error: "Server configuration error: filesCollectionId is missing" },
				{ status: 500 },
			);
		}

		if (!appwriteConfig.usersCollectionId) {
			console.error("Missing usersCollectionId configuration");
			return NextResponse.json(
				{ error: "Server configuration error: usersCollectionId is missing" },
				{ status: 500 },
			);
		}

		// Get accountId - try session first, fallback to database lookup for 2FA users
		let accountId: string;

		// Create admin client early (we'll need it for storage/tablesDB anyway)
		let adminClient;
		try {
			adminClient = await createApiAdminClient();
		} catch (clientError) {
			console.error("Failed to create Appwrite admin client:", {
				error:
					clientError instanceof Error
						? clientError.message
						: String(clientError),
				stack: clientError instanceof Error ? clientError.stack : undefined,
			});
			return NextResponse.json(
				{
					error: "Failed to initialize Appwrite client",
					details:
						clientError instanceof Error
							? clientError.message
							: "Unknown error",
				},
				{ status: 500 },
			);
		}

		try {
			// Try to get accountId from session (for regular authenticated users)
			const { account } = await createApiSessionClient();
			const session = await account.get();
			accountId = session.$id;
		} catch (_sessionError) {
			// If no session (e.g., 2FA users), fetch accountId from database using userId
			console.log(
				"No session found, fetching accountId from database for userId:",
				userId,
			);
			try {
				const userResponse = await adminClient.tablesDB.listRows(
					appwriteConfig.databaseId!,
					appwriteConfig.usersCollectionId!,
					[Query.equal("$id", userId)],
				);

				if (userResponse.rows.length === 0) {
					return NextResponse.json(
						{ error: "User not found" },
						{ status: 404 },
					);
				}

				const user = userResponse.rows[0];
				accountId = user.accountId || userId; // Fallback to userId if accountId not set
				console.log("Retrieved accountId from database:", accountId);
			} catch (dbError) {
				console.error("Failed to fetch accountId from database:", dbError);
				return NextResponse.json(
					{ error: "Authentication required" },
					{ status: 401 },
				);
			}
		}

		// Use admin client for storage and tablesDB operations
		const { storage, tablesDB } = adminClient;

		try {
			// Convert File to ArrayBuffer for InputFile.fromBuffer
			const arrayBuffer = await file.arrayBuffer();
			const inputFile = InputFile.fromBuffer(
				Buffer.from(arrayBuffer),
				file.name,
			);

			console.log("Uploading file to Appwrite storage:", {
				fileName: file.name,
				fileSize: file.size,
				bucketId: appwriteConfig.bucketId,
			});

			// Upload to Appwrite storage
			const bucketFile = await storage.createFile(
				appwriteConfig.bucketId,
				ID.unique(),
				inputFile,
			);

			console.log("File uploaded to storage successfully:", {
				bucketFileId: bucketFile.$id,
				bucketFileName: bucketFile.name,
			});

			const fileDocument = {
				type: getFileType(bucketFile.name).type,
				name: bucketFile.name,
				url: constructFileUrl(bucketFile.$id),
				extension: getFileType(bucketFile.name).extension,
				size: bucketFile.sizeOriginal,
				owner: userId,
				accountId,
				users: [],
				bucketFileId: bucketFile.$id,
			};

			console.log("Creating file document in database:", {
				databaseId: appwriteConfig.databaseId,
				collectionId: appwriteConfig.filesCollectionId,
				fileDocument,
			});

			const newFile = await tablesDB.createRow(
				appwriteConfig.databaseId,
				appwriteConfig.filesCollectionId,
				ID.unique(),
				fileDocument,
			);

			console.log("File document created successfully:", {
				fileId: newFile.$id,
			});

			if (!newFile) {
				// Clean up uploaded file if database creation fails
				await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
				throw new Error("File document creation failed");
			}

			await logAuditEvent({
				event_id: `document_upload_${newFile.$id}`,
				event_title: `Document uploaded: ${bucketFile.name}`,
				action: "create",
				source: "caalm",
				user_id: userId,
				user_name: userId,
				user_email: "",
				status: "success",
				module: "documents",
				target_type: "document",
				target_id: newFile.$id,
				target_label: bucketFile.name,
				summary: `Document uploaded: ${bucketFile.name}`,
				correlation_id: uploadId || undefined,
				metadata: {
					bucketFileId: bucketFile.$id,
					size: bucketFile.sizeOriginal,
					extension: getFileType(bucketFile.name).extension,
				},
			});

			await CacheManager.invalidateStorage();

			return NextResponse.json({
				data: newFile,
				uploadId,
				message: "File uploaded successfully",
			});
		} catch (uploadError: any) {
			// Appwrite errors may have a different structure
			const errorMessage =
				uploadError?.message ||
				uploadError?.response?.message ||
				uploadError?.toString() ||
				"Unknown Appwrite error";

			const errorCode = uploadError?.code || uploadError?.response?.code;
			const errorType = uploadError?.type || uploadError?.response?.type;

			console.error("Appwrite upload error:", {
				error: errorMessage,
				code: errorCode,
				type: errorType,
				stack: uploadError instanceof Error ? uploadError.stack : undefined,
				fullError: uploadError,
				timestamp: new Date().toISOString(),
			});

			throw new Error(errorMessage);
		}
	} catch (error: any) {
		// Extract error message from various possible structures
		const errorMessage =
			error?.message ||
			error?.response?.message ||
			error?.toString() ||
			"Unknown error occurred during upload";

		const errorCode = error?.code || error?.response?.code;

		console.error("File upload error:", {
			error: errorMessage,
			code: errorCode,
			stack: error instanceof Error ? error.stack : undefined,
			fullError: error,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			{
				error: "Failed to upload file",
				details: errorMessage,
				code: errorCode,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
