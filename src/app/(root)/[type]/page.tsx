import Image from "next/image";
import ContractsAttentionStrip from "@/components/ContractsAttentionStrip";
import ContractsControlBar from "@/components/ContractsControlBar";
import ContractsHeaderActions from "@/components/ContractsHeaderActions";
import ContractsMetricsBar from "@/components/ContractsMetricsBar";
import { ContractsViewProvider } from "@/components/ContractsView";
import ContractsViewClient from "@/components/ContractsViewClient";
import FileUsageOverview from "@/components/FileUsageOverview";
import FileUploader from "@/components/FileUploader";
import FilesLibraryClient from "@/components/FilesLibraryClient";
import StorageUsageBar from "@/components/StorageUsageBar";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { getFiles } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFileLibraryEmptyState } from "@/lib/storage/fileLibraryEmptyState";
import { getFileLibraryPageTitle, getFileTypesParams, isDocumentFileExtension } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

type FileType = "image" | "video" | "audio" | "document" | "other";

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { appwriteConfig } from "@/lib/appwrite/config";

interface SearchParamProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
	params: Promise<{ [key: string]: string | string[] | undefined }>;
}

const Page = async ({ searchParams, params }: SearchParamProps) => {
	const type = ((await params)?.type as string) || "";
	const searchText = ((await searchParams)?.query as string) || "";
	const sort =
		((await searchParams)?.sort as string) || "$createdAt-desc";

	let files: { documents: UIFileDoc[] } = { documents: [] };
	let filteredDocuments: UIFileDoc[] = [];
	let uniqueDepartments: string[] = [];
	let uniqueAssignedManagers: string[] = [];
	let contractDocuments: UIFileDoc[] = [];

	// Special handling for contracts - get ALL contracts from contracts collection
	if (type.toLowerCase() === "contracts") {
		const queries = [];

		if (searchText) {
			queries.push(Query.contains("contractName", searchText));
		}

		if (sort) {
			const [sortBy, orderBy] = sort.split("-");
			const contractSortField =
				sortBy === "$createdAt"
					? "$createdAt"
					: sortBy === "name"
						? "contractName"
						: sortBy === "size"
							? "amount"
							: sortBy;

			if (orderBy === "asc") {
				queries.push(Query.orderAsc(contractSortField));
			} else {
				queries.push(Query.orderDesc(contractSortField));
			}
		} else {
			queries.push(Query.orderDesc("$createdAt"));
		}

		const { tablesDB } = await createAdminClient();

		const contractsResult = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: queries,
		});

		const isValidDocumentId = (id: string | null | undefined): boolean => {
			if (!id || typeof id !== "string") return false;
			if (id.length > 36) return false;
			if (id.startsWith("_")) return false;
			return /^[a-zA-Z0-9_]+$/.test(id);
		};

		// Batch-fetch file metadata (one round-trip per ~80 IDs) instead of N+1 getDocument calls
		const fileIds = Array.from(
			new Set(
				contractsResult.rows
					.map((c: any) => c.fileId as string | undefined)
					.filter((id): id is string => !!id && isValidDocumentId(id)),
			),
		);

		const filesById = new Map<string, any>();
		const FILE_ID_BATCH = 80;
		if (fileIds.length > 0 && appwriteConfig.filesCollectionId) {
			const batches: string[][] = [];
			for (let i = 0; i < fileIds.length; i += FILE_ID_BATCH) {
				batches.push(fileIds.slice(i, i + FILE_ID_BATCH));
			}
			const batchResults = await Promise.all(
				batches.map((batch) => {
					const fileQueries =
						batch.length === 1
							? [Query.equal("$id", batch[0]), Query.limit(batch.length)]
							: [
									Query.or(batch.map((id) => Query.equal("$id", id))),
									Query.limit(batch.length),
								];
					return tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						queries: fileQueries,
					});
				}),
			);
			for (const result of batchResults) {
				for (const file of result.rows) {
					filesById.set(file.$id, file);
				}
			}
		}

		contractDocuments = contractsResult.rows.map((contract: any) => {
			const fileData =
				contract.fileId && isValidDocumentId(contract.fileId)
					? filesById.get(contract.fileId)
					: undefined;

			const contractAsFile: UIFileDoc = {
				$id: contract.$id,
				$createdAt: contract.$createdAt,
				$updatedAt: contract.$updatedAt,
				$permissions: contract.$permissions,
				$collectionId: contract.$collectionId,
				$databaseId: contract.$databaseId,
				$sequence: contract.$sequence || 0,
				name: contract.contractName || contract.name || "Untitled Contract",
				type: "document",
				extension: fileData?.extension || "pdf",
				url: fileData?.url || "",
				size: fileData?.size || 0,
				owner:
					contract.contractOwnerId || contract.owner || fileData?.owner || "",
				users: contract.users || fileData?.users || [],
				contractId: contract.$id,
				contractName: contract.contractName,
				contractOwnerId: contract.contractOwnerId,
				contractExpiryDate: contract.contractExpiryDate,
				status: contract.status,
				contractType: contract.contractType,
				amount: contract.amount,
				vendor: contract.vendor,
				contractNumber: contract.contractNumber,
				priority: contract.priority,
				compliance: contract.compliance,
				department: contract.department,
				assignedManagers: contract.assignedManagers,
				description: contract.description,
				riskLevel: contract.riskLevel,
				bucketFileId: fileData?.bucketFileId || contract.bucketFileId,
			};

			return contractAsFile;
		});

		files = { documents: contractDocuments };
		filteredDocuments = contractDocuments;

		// Extract unique departments and assigned managers for filter options
		uniqueDepartments = Array.from(
			new Set(
				contractDocuments
					.map((doc: UIFileDoc) => doc.department)
					.filter(Boolean),
			),
		) as string[];
		uniqueAssignedManagers = Array.from(
			new Set(
				contractDocuments
					.flatMap((doc: UIFileDoc) => doc.assignedManagers || [])
					.filter(Boolean),
			),
		) as string[];
	} else {
		// Regular file handling for other types
		const types = getFileTypesParams(type) as FileType[];
		files = await getFiles({ types, searchText, sort });

		// If type is 'images', filter to only png, jpg, jpeg
		filteredDocuments = files.documents as UIFileDoc[];
		if (type.toLowerCase() === "images") {
			filteredDocuments = files.documents.filter((file: UIFileDoc) => {
				const ext = (file.extension || "").toLowerCase();
				return ext === "png" || ext === "jpg" || ext === "jpeg";
			});
		}
		if (type.toLowerCase() === "documents") {
			filteredDocuments = files.documents.filter((file: UIFileDoc) => {
				const ext = (file.extension || "").toLowerCase();
				return file.type === "document" || isDocumentFileExtension(ext);
			});
		}
	}

	// Fetch total space data for File Usage Overview
	// Get current user
	const user = await getCurrentUser();
	const emptyState = getFileLibraryEmptyState(type);

	// Ensure filteredDocuments is always defined
	if (!filteredDocuments) {
		filteredDocuments = files?.documents || [];
	}

	// Calculate total size in bytes
	const totalSizeBytes = filteredDocuments.reduce(
		(sum: number, file: UIFileDoc) => sum + (file.size || 0),
		0,
	);
	// Format total size using convertFileSize
	const { convertFileSize } = await import("@/lib/utils");
	const totalSizeFormatted = convertFileSize({ sizeInBytes: totalSizeBytes });

	// Calculate contract count for contracts page
	const _contractCount =
		type.toLowerCase() === "contracts" ? contractDocuments.length : 0;

	const pageTitle = getFileLibraryPageTitle(type);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			{type.toLowerCase() === "contracts" ? (
				<ContractsViewProvider>
					<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
						<h1 className="h1 capitalize sidebar-gradient-text">{pageTitle}</h1>
					</div>
					<div className="mb-6 flex items-center justify-end">
						<ContractsHeaderActions files={contractDocuments} />
					</div>
					<ContractsAttentionStrip files={contractDocuments} />
					<ContractsMetricsBar files={contractDocuments} />

					<GlassCard className="glass-card mb-6">
						<div className="glass-card-cap" />
						<CardContent className="p-0">
							<ContractsControlBar
								files={contractDocuments}
								departments={uniqueDepartments}
								assignedManagers={uniqueAssignedManagers}
							/>
							{filteredDocuments.length > 0 ? (
								<ContractsViewClient files={filteredDocuments} user={user} />
							) : (
								<div className="flex flex-col items-center justify-center text-center py-12 px-4">
									<Image
										src="/assets/icons/no-data.svg"
										alt="No contracts uploaded yet"
										width={250}
										height={250}
										className="mb-4 opacity-60 mx-auto"
									/>
									<p className="body-1 text-slate-700">
										No contracts uploaded yet
									</p>
								</div>
							)}
						</CardContent>
					</GlassCard>
				</ContractsViewProvider>
			) : (
				<>
					<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
						<h1 className="h1 capitalize sidebar-gradient-text">{pageTitle}</h1>
					</div>
					{/* Storage Progress Bar - account-wide usage from org tier limit */}
					{(!type || type.toLowerCase() === "uploads") && (
						<section className="mb-6 w-full">
							<StorageUsageBar showLabel />
						</section>
					)}
					{(!type ||
						type.toLowerCase() === "uploads" ||
						type.toLowerCase() === "documents") &&
						user && (
							<div className="mb-6 flex w-full items-center justify-end">
								<FileUploader
									ownerId={user.$id}
									accountId={user.$id}
									className="primary-btn h-10 px-4 shadow-drop-1 text-sm"
								/>
							</div>
						)}
					{(!type || type.toLowerCase() === "uploads") && (
						<section className="mb-8 w-full">
							<FileUsageOverview />
						</section>
					)}
					<FilesLibraryClient
						files={filteredDocuments}
						totalSizeFormatted={totalSizeFormatted}
						emptyMessage={emptyState.message}
						emptyAlt={emptyState.alt}
						user={user}
					/>
				</>
			)}
		</div>
	);
};

export default Page;
