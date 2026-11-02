"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { applyContractListFilters } from "@/lib/contracts/contractsListUtils";
import { fetcher } from "@/lib/swr-config";
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
	const { filters, statusTab, listScope, setListScope } = useContractsView();

	const { data: removedData, mutate: mutateRemoved } = useSWR<{
		data?: { files?: UIFileDoc[] };
	}>(listScope === "removed" ? "/api/contracts/removed" : null, fetcher, {
		revalidateOnFocus: false,
	});

	const handleRefresh = () => {
		if (listScope === "removed") {
			void mutateRemoved();
			setListScope("active");
			router.refresh();
			return;
		}
		router.refresh();
	};

	const sourceFiles =
		listScope === "removed" ? (removedData?.data?.files ?? []) : files;

	const filteredFiles = useMemo(
		() =>
			listScope === "removed"
				? sourceFiles
				: applyContractListFilters(sourceFiles, filters, statusTab),
		[sourceFiles, filters, statusTab, listScope],
	);

	return (
		<>
			<ContractsView
				files={filteredFiles}
				user={user}
				onRefresh={handleRefresh}
			/>
			{listScope === "active" ? (
				<ContractsBulkBar files={filteredFiles} />
			) : null}
		</>
	);
}
