import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

async function runDiagnostics(fileId: string) {
	const { tablesDB } = await createAdminClient();

	if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
		throw new Error("Database configuration missing");
	}

	const diagnostics: any = {
		fileId,
		fileExists: false,
		fileData: null,
		issues: [] as string[],
		relationships: {
			owner: null,
			contracts: [],
			licenses: [],
		},
		requiredFields: {
			missing: [] as string[],
			present: [] as string[],
		},
	};

	try {
		// 1. Check if file exists
		const file = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			rowId: fileId,
		});

		diagnostics.fileExists = true;
		diagnostics.fileData = {
			$id: file.$id,
			name: file.name,
			orgId: file.orgId || null,
			owner: file.owner || null,
			accountId: file.accountId || null,
			bucketFileId: file.bucketFileId || null,
			isContract: file.isContract || false,
			contractId: file.contractId || null,
		};

		// 2. Check required fields
		const requiredFields = ["name", "url", "type", "bucketFileId", "accountId"];
		requiredFields.forEach((field) => {
			if (!file[field as keyof typeof file]) {
				diagnostics.requiredFields.missing.push(field);
			} else {
				diagnostics.requiredFields.present.push(field);
			}
		});

		// Check orgId (might be required now)
		if (!file.orgId) {
			diagnostics.issues.push("orgId is missing - this may block deletion");
		}

		// 3. Check owner relationship
		if (file.owner) {
			try {
				const ownerId =
					typeof file.owner === "string" ? file.owner : file.owner.$id;
				diagnostics.relationships.owner = {
					id: ownerId,
					type: typeof file.owner,
				};

				// Try to fetch owner to see if it exists
				try {
					const owner = await tablesDB.getRow({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.usersCollectionId!,
						rowId: ownerId,
					});
					diagnostics.relationships.owner.exists = true;
					diagnostics.relationships.owner.orgId = owner.orgId || null;
				} catch (_error: any) {
					diagnostics.relationships.owner.exists = false;
					diagnostics.issues.push(
						`Owner user ${ownerId} does not exist - this may cause deletion issues`,
					);
				}
			} catch (error: any) {
				diagnostics.issues.push(`Error checking owner: ${error.message}`);
			}
		}

		// 4. Check for contracts referencing this file
		if (appwriteConfig.contractsCollectionId) {
			try {
				const contracts = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.contractsCollectionId,
					queries: [
						Query.or([
							Query.equal("fileId", fileId),
							Query.equal("fileRef", fileId),
						]),
					],
				});

				if (contracts.rows.length > 0) {
					diagnostics.relationships.contracts = contracts.rows.map(
						(c: any) => ({
							$id: c.$id,
							contractName: c.contractName,
							fileId: c.fileId,
							fileRef: c.fileRef,
							orgId: c.orgId || null,
						}),
					);
					diagnostics.issues.push(
						`${contracts.rows.length} contract(s) reference this file - deletion will set fileRef to null`,
					);
				}
			} catch (error: any) {
				diagnostics.issues.push(`Error checking contracts: ${error.message}`);
			}
		}

		// 5. Check for licenses referencing this file
		try {
			const licenses = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: "6912f13200a9f1234567", // Licenses collection ID
				queries: [Query.equal("fileRef", fileId)],
			});

			if (licenses.rows.length > 0) {
				diagnostics.relationships.licenses = licenses.rows.map((l: any) => ({
					$id: l.$id,
					licenseName: l.licenseName,
					fileRef: l.fileRef,
				}));
				diagnostics.issues.push(
					`${licenses.rows.length} license(s) reference this file - deletion will set fileRef to null`,
				);
			}
		} catch (error: any) {
			// Licenses collection might not exist or have different ID
			console.log("Could not check licenses:", error.message);
		}

		// 6. Try a test update to see if the file can be modified
		try {
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileId,
				data: {
					// Just update a non-critical field to test
					extension: file.extension || "test",
				},
			});
			diagnostics.canUpdate = true;
		} catch (error: any) {
			diagnostics.canUpdate = false;
			diagnostics.issues.push(
				`Cannot update file - this suggests validation errors: ${error.message}`,
			);
		}

		// 7. Check if orgId is required and missing
		if (!file.orgId) {
			diagnostics.recommendations = [
				"Run the orgId migration: POST /api/files/migrate-orgid",
				"Or manually set orgId on this file before deletion",
			];
		}

		if (diagnostics.relationships.contracts.length > 0) {
			diagnostics.recommendations = [
				...(diagnostics.recommendations || []),
				"Clear fileRef relationships: POST /api/files/clear-contract-refs",
				"Or delete associated contracts first",
			];
		}
	} catch (error: any) {
		if (error?.code === 404) {
			diagnostics.fileExists = false;
			diagnostics.issues.push("File does not exist");
		} else {
			diagnostics.issues.push(`Error fetching file: ${error.message}`);
		}
	}

	return diagnostics;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fileId = searchParams.get("fileId");

		if (!fileId) {
			return NextResponse.json(
				{ error: "fileId query parameter is required" },
				{ status: 400 },
			);
		}

		const diagnostics = await runDiagnostics(fileId);

		return NextResponse.json({
			success: true,
			diagnostics,
		});
	} catch (error: any) {
		console.error("Diagnostic error:", error);
		return NextResponse.json(
			{
				error: "Diagnostic failed",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fileId = searchParams.get("fileId");

		if (!fileId) {
			return NextResponse.json(
				{ error: "fileId query parameter is required" },
				{ status: 400 },
			);
		}

		const diagnostics = await runDiagnostics(fileId);

		return NextResponse.json({
			success: true,
			diagnostics,
		});
	} catch (error: any) {
		console.error("Diagnostic error:", error);
		return NextResponse.json(
			{
				error: "Diagnostic failed",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}
