import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import ApprovalsPageShell from "@/components/approvals/ApprovalsPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	contractToApprovalItem,
} from "@/lib/approvals/approvalsListUtils";
import { createAdminClient } from "@/lib/appwrite/admin";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserPermissions } from "@/lib/rbac/permissions";
import type { UIFileDoc } from "@/types/files";

export default async function ContractsApprovalsPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const permissions = await getUserPermissions(user.$id);
	const canReview = permissions.includes(PERMISSIONS.CONTRACTS.REVIEW);
	const canApprove = permissions.includes(PERMISSIONS.CONTRACTS.APPROVE);
	if (!canReview && !canApprove) {
		redirect("/dashboard");
	}

	let contractDocuments: UIFileDoc[] = [];

	try {
		const { databases, tablesDB } = await createAdminClient();
		const contractsResult = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: [Query.orderDesc("$createdAt"), Query.limit(500)],
		});

		const isValidDocumentId = (id: string | null | undefined): boolean => {
			if (!id || typeof id !== "string") return false;
			if (id.length > 36) return false;
			if (id.startsWith("_")) return false;
			return /^[a-zA-Z0-9_]+$/.test(id);
		};

		contractDocuments = await Promise.all(
			contractsResult.rows.map(async (contract: Record<string, unknown>) => {
				let fileData: Record<string, unknown> | null = null;
				const fileId = contract.fileId as string | undefined;
				if (fileId && isValidDocumentId(fileId)) {
					try {
						fileData = (await databases.getDocument({
							databaseId: appwriteConfig.databaseId!,
							collectionId: appwriteConfig.filesCollectionId!,
							documentId: fileId,
						})) as unknown as Record<string, unknown>;
					} catch {
						fileData = null;
					}
				}

				const contractAsFile: UIFileDoc = {
					$id: String(contract.$id),
					$createdAt: String(contract.$createdAt),
					$updatedAt: String(contract.$updatedAt),
					$permissions: (contract.$permissions as string[]) || [],
					$collectionId: String(contract.$collectionId || ""),
					$databaseId: String(contract.$databaseId || ""),
					$sequence: Number(contract.$sequence || 0),
					name:
						String(contract.contractName || contract.name || "Untitled Contract"),
					type: "document",
					extension: String(fileData?.extension || "pdf"),
					url: String(fileData?.url || ""),
					size: Number(fileData?.size || 0),
					owner: String(
						contract.contractOwnerId || contract.owner || fileData?.owner || "",
					),
					users: (contract.users as string[]) || [],
					contractId: String(contract.$id),
					contractName: contract.contractName as string | undefined,
					contractOwnerId: contract.contractOwnerId as string | undefined,
					contractExpiryDate: contract.contractExpiryDate as string | undefined,
					status: contract.status as UIFileDoc["status"],
					contractType: contract.contractType as string | undefined,
					amount: contract.amount as number | undefined,
					vendor: contract.vendor as string | undefined,
					contractNumber: contract.contractNumber as string | undefined,
					department: contract.department as string | undefined,
					assignedManagers: contract.assignedManagers as string[] | undefined,
					description: contract.description as string | undefined,
					bucketFileId: String(
						fileData?.bucketFileId || contract.bucketFileId || "",
					),
				};
				return contractAsFile;
			}),
		);
	} catch (error) {
		console.error("Error fetching contracts for approvals:", error);
		contractDocuments = [];
	}

	const items = contractDocuments.map(contractToApprovalItem);
	const departments = Array.from(
		new Set(items.map((i) => i.department).filter((d): d is string => !!d)),
	).sort();
	const assignedManagers = Array.from(
		new Set(items.flatMap((i) => i.assignees).filter(Boolean)),
	).sort();
	const itemTypes = Array.from(
		new Set(items.map((i) => i.itemType).filter((t): t is string => !!t)),
	).sort();

	return (
		<ApprovalsPageShell
			entity="contract"
			title="Proposals & Approvals"
			items={items}
			departments={departments}
			assignedManagers={assignedManagers}
			itemTypes={itemTypes}
			canDecide={canApprove}
		/>
	);
}
