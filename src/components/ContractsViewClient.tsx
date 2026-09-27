"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { applyContractListFilters } from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";
import ContractsBulkBar from "./ContractsBulkBar";
import ContractsView, { useContractsView } from "./ContractsView";

interface ContractsViewClientProps {
	files: UIFileDoc[];
	user: {
		role?: string;
	} | null;
}

export default function ContractsViewClient({
	files,
	user,
}: ContractsViewClientProps) {
	const router = useRouter();
	const { filters, statusTab } = useContractsView();

	const handleRefresh = () => {
		router.refresh();
	};

	const filteredFiles = useMemo(
		() => applyContractListFilters(files, filters, statusTab),
		[files, filters, statusTab],
	);

	return (
		<>
			<ContractsView
				files={filteredFiles}
				user={user}
				onRefresh={handleRefresh}
			/>
			<ContractsBulkBar files={filteredFiles} />
		</>
	);
}
