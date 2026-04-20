import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

// Helper function to validate Appwrite storage file ID format
const isValidBucketFileId = (id: string | null | undefined): boolean => {
	if (!id || typeof id !== "string") return false;
	if (id.length > 36) return false;
	if (id.startsWith("_")) return false;
	return /^[a-zA-Z0-9_]+$/.test(id);
};

// Helper function to find a file in storage by name
async function findFileInStorageByName(
	fileName: string,
	bucketId: string,
): Promise<string | null> {
	try {
		const { storage } = await createAdminClient();
		const normalizedSearchName = fileName.toLowerCase().trim();

		console.log(
			`[findFileInStorageByName] Searching for file: "${fileName}" (normalized: "${normalizedSearchName}")`,
		);

		let offset = 0;
		const limit = 100;
		let hasMore = true;
		let totalSearched = 0;

		while (hasMore) {
			const files = await storage.listFiles({
				bucketId,
				queries: [Query.limit(limit), Query.offset(offset)],
			});

			if (!files.files || files.files.length === 0) {
				hasMore = false;
				break;
			}

			totalSearched += files.files.length;
			console.log(
				`[findFileInStorageByName] Searched ${totalSearched} files so far...`,
			);

			// Find exact match first
			const exactMatch = files.files.find(
				(file) => file.name.toLowerCase().trim() === normalizedSearchName,
			);

			if (exactMatch && isValidBucketFileId(exactMatch.$id)) {
				console.log(
					`[findFileInStorageByName] Found exact match: "${exactMatch.name}" -> ${exactMatch.$id}`,
				);
				return exactMatch.$id;
			}

			// Try partial match
			const nameWithoutExt = normalizedSearchName.replace(/\.[^.]+$/, "");
			const partialMatch = files.files.find((file) => {
				const fileNameWithoutExt = file.name
					.toLowerCase()
					.trim()
					.replace(/\.[^.]+$/, "");
				return fileNameWithoutExt === nameWithoutExt;
			});

			if (partialMatch && isValidBucketFileId(partialMatch.$id)) {
				console.log(
					`[findFileInStorageByName] Found partial match: "${partialMatch.name}" -> ${partialMatch.$id}`,
				);
				return partialMatch.$id;
			}

			if (files.files.length < limit) {
				hasMore = false;
			} else {
				offset += limit;
				if (offset >= 1000) {
					hasMore = false;
				}
			}
		}

		console.warn(
			`[findFileInStorageByName] File not found after searching ${totalSearched} files`,
		);
		return null;
	} catch (error: any) {
		console.error(
			"[findFileInStorageByName] Error searching for file in storage:",
			error,
		);
		return null;
	}
}

// Improved buffer conversion function
async function convertToBuffer(fileContent: any): Promise<Buffer> {
	// If it's already a Buffer, return it
	if (Buffer.isBuffer(fileContent)) {
		return fileContent;
	}

	// If it's an ArrayBuffer, convert directly
	if (fileContent instanceof ArrayBuffer) {
		return Buffer.from(fileContent);
	}

	// If it's a Uint8Array, convert directly
	if (fileContent instanceof Uint8Array) {
		return Buffer.from(fileContent);
	}

	// If it's a Response object
	if (fileContent instanceof Response) {
		const arrayBuffer = await fileContent.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	// If it has an arrayBuffer method
	if (fileContent && typeof fileContent.arrayBuffer === "function") {
		const arrayBuffer = await fileContent.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	// If it has a body property
	if (fileContent?.body) {
		const body = fileContent.body;

		// If body is an ArrayBuffer
		if (body instanceof ArrayBuffer) {
			return Buffer.from(body);
		}

		// If body is a ReadableStream (web streams)
		if (body && typeof body.getReader === "function") {
			const reader = body.getReader();
			const chunks: Uint8Array[] = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) {
					chunks.push(value);
				}
			}

			return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
		}
	}

	// If it's a ReadableStream directly
	if (fileContent && typeof fileContent.getReader === "function") {
		const reader = fileContent.getReader();
		const chunks: Uint8Array[] = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				chunks.push(value);
			}
		}

		return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
	}

	throw new Error(
		`Unable to convert file content to buffer. Type: ${typeof fileContent}, Constructor: ${
			fileContent?.constructor?.name
		}`,
	);
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const bucketFileId = searchParams.get("bucketFileId");
		const fileId = searchParams.get("fileId");
		const contractId = searchParams.get("contractId");

		let validBucketFileId: string | null = null;
		let fileName: string | null = null;

		// If bucketFileId is provided and valid, use it
		if (bucketFileId && isValidBucketFileId(bucketFileId)) {
			validBucketFileId = bucketFileId;
		} else if (fileId) {
			// Fetch file document to get bucketFileId
			try {
				const { tablesDB } = await createAdminClient();
				const fileDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: fileId,
				});

				const docBucketFileId = (fileDoc as any).bucketFileId;
				fileName = (fileDoc as any).name || (fileDoc as any).contractName;

				if (docBucketFileId && isValidBucketFileId(docBucketFileId)) {
					validBucketFileId = docBucketFileId;
				} else if (fileName && appwriteConfig.bucketId) {
					// Try to find file in storage
					const foundBucketFileId = await findFileInStorageByName(
						fileName,
						appwriteConfig.bucketId,
					);

					if (foundBucketFileId) {
						validBucketFileId = foundBucketFileId;
						// Update the document
						try {
							await tablesDB.updateRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.filesCollectionId!,
								rowId: fileId,
								data: { bucketFileId: foundBucketFileId },
							});
						} catch (updateError) {
							console.error("Failed to update bucketFileId:", updateError);
						}
					}
				}
			} catch (error) {
				console.error("Failed to fetch file document:", error);
			}
		} else if (contractId) {
			// Fetch contract to get fileId
			try {
				const { tablesDB } = await createAdminClient();
				const contractDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: contractId,
				});

				const contractBucketFileId = (contractDoc as any).bucketFileId;
				const contractFileId = (contractDoc as any).fileId;

				if (contractBucketFileId && isValidBucketFileId(contractBucketFileId)) {
					validBucketFileId = contractBucketFileId;
				} else if (contractFileId) {
					const fileDoc = await tablesDB.getRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						rowId: contractFileId,
					});

					const docBucketFileId = (fileDoc as any).bucketFileId;
					fileName = (fileDoc as any).name || (contractDoc as any).contractName;

					if (docBucketFileId && isValidBucketFileId(docBucketFileId)) {
						validBucketFileId = docBucketFileId;
					} else if (fileName && appwriteConfig.bucketId) {
						const foundBucketFileId = await findFileInStorageByName(
							fileName,
							appwriteConfig.bucketId,
						);

						if (foundBucketFileId) {
							validBucketFileId = foundBucketFileId;
							try {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.filesCollectionId!,
									rowId: contractFileId,
									data: { bucketFileId: foundBucketFileId },
								});
							} catch (updateError) {
								console.error("Failed to update bucketFileId:", updateError);
							}
						}
					}
				}
			} catch (error) {
				console.error("Failed to fetch contract:", error);
			}
		}

		if (!validBucketFileId) {
			console.error("Download failed - missing bucketFileId:", {
				bucketFileId,
				fileId,
				contractId,
			});

			return NextResponse.json(
				{
					error: "Valid bucketFileId not found",
					message: "Unable to determine valid storage file ID.",
				},
				{ status: 400 },
			);
		}

		if (!appwriteConfig.bucketId) {
			return NextResponse.json(
				{ error: "Bucket configuration missing" },
				{ status: 500 },
			);
		}

		const { storage } = await createAdminClient();

		// Get file metadata
		const file = await storage.getFile({
			bucketId: appwriteConfig.bucketId,
			fileId: validBucketFileId,
		});

		console.log(`[Download] Fetching file: ${file.name} (${file.mimeType})`);

		// Get file download content
		const fileContent = await storage.getFileDownload({
			bucketId: appwriteConfig.bucketId,
			fileId: validBucketFileId,
		});

		// Convert to buffer using improved function
		const buffer = await convertToBuffer(fileContent);

		console.log(
			`[Download] Buffer size: ${buffer.length}, Expected: ${file.sizeOriginal}`,
		);

		// Sanitize filename
		const sanitizedFilename = file.name
			? file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
			: "download";

		// Determine Content-Type
		let contentType = file.mimeType || "application/octet-stream";

		if (!file.mimeType && file.name?.toLowerCase().endsWith(".pdf")) {
			contentType = "application/pdf";
		}

		console.log(`[Download] Serving file with Content-Type: ${contentType}`);

		// Return the file with proper headers
		// Convert Buffer to ArrayBuffer for NextResponse compatibility
		const arrayBuffer = buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		);
		return new NextResponse(
			arrayBuffer instanceof ArrayBuffer ? arrayBuffer : new Uint8Array(buffer),
			{
				status: 200,
				headers: {
					"Content-Type": contentType,
					"Content-Disposition": `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(
						file.name || "download",
					)}`,
					"Content-Length": buffer.length.toString(),
					"Cache-Control": "no-cache, no-store, must-revalidate",
					Pragma: "no-cache",
					Expires: "0",
				},
			},
		);
	} catch (error: any) {
		console.error("Error handling file download:", error);

		const errorMessage = error?.message || "Unknown error occurred";
		const errorCode = error?.code || "DOWNLOAD_ERROR";

		if (error?.code === 404 || errorMessage.includes("not found")) {
			return NextResponse.json(
				{
					error: "File not found",
					message: "The requested file could not be found in storage.",
					code: errorCode,
				},
				{
					status: 404,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		return NextResponse.json(
			{
				error: "Download failed",
				message: errorMessage,
				code: errorCode,
			},
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
}
