"use client";

import type { UIFileDoc } from "@/types/files";
import ContractsFilter from "./ContractsFilter";
import ContractsFilterChips from "./ContractsFilterChips";
import ContractsSavedViews from "./ContractsSavedViews";
import ContractsStatusTabs from "./ContractsStatusTabs";
import ContractsTopControls from "./ContractsTopControls";
import { ContractsViewToggle } from "./ContractsViewToggle";
import { useContractsView } from "./ContractsViewContext";
import Sort from "./Sort";

interface ContractsControlBarProps {
	files: UIFileDoc[];
	departments?: string[];
	assignedManagers?: string[];
}

export default function ContractsControlBar({
	files,
	departments = [],
	assignedManagers = [],
}: ContractsControlBarProps) {
	const { listAnchorRef } = useContractsView();

	return (
		<div ref={listAnchorRef} className="w-full scroll-mt-4">
			<ContractsStatusTabs files={files} />
			<div className="flex pt-4 pb-3 px-4 sm:px-6 gap-3 justify-between flex-wrap">
				<ContractsTopControls files={files} />
				<div className="flex items-center gap-2 justify-end flex-wrap">
					<ContractsFilter
						departments={departments}
						assignedManagers={assignedManagers}
					/>
					<ContractsSavedViews />
					<Sort />
					<ContractsViewToggle />
				</div>
			</div>
			<ContractsFilterChips />
		</div>
	);
}
