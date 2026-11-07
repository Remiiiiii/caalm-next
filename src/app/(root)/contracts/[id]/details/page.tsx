import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContractDetailsPage from "@/components/contracts/ContractDetailsPage";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { contractRowToFileDoc } from "@/lib/contracts/contract-row-to-file";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Contract details | CAALM",
	description: "Contract and file details for a single contract.",
};

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePagePermission(PERMISSIONS.CONTRACTS.VIEW);
	const { id } = await params;

	const { tablesDB } = await createAdminClient();
	let row: Record<string, unknown>;
	try {
		row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "",
			tableId: appwriteConfig.contractsCollectionId || "",
			rowId: id,
		});
	} catch {
		notFound();
	}

	let fileRow: Record<string, unknown> | undefined;
	if (row.fileId && appwriteConfig.filesCollectionId) {
		try {
			fileRow = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId || "",
				tableId: appwriteConfig.filesCollectionId,
				rowId: row.fileId as string,
			});
		} catch {
			// No linked file row — details page still renders contract fields.
		}
	}

	const file = contractRowToFileDoc(row, fileRow);

	return <ContractDetailsPage file={file} />;
}
