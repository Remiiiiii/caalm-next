"use client";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { DATA_TABLE_TOOLBAR_INSET } from "@/lib/ui/data-table-styles";
import type { UIFileDoc } from "@/types/files";
import ContractsFilter from "./ContractsFilter";
import ContractsFilterChips from "./ContractsFilterChips";
import ContractsSavedViews from "./ContractsSavedViews";
import ContractsStatusTabs from "./ContractsStatusTabs";
import ContractsTopControls from "./ContractsTopControls";
import { useContractsView } from "./ContractsViewContext";
import { ContractsViewToggle } from "./ContractsViewToggle";
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
	const { listAnchorRef, listScope, setListScope } = useContractsView();
	const { permissions } = usePermissions();
	const canManageRemoved =
		permissions.includes(PERMISSIONS.CONTRACTS.EDIT) ||
		permissions.includes(PERMISSIONS.CONTRACTS.APPROVE);

	return (
		<div ref={listAnchorRef} className="w-full scroll-mt-4">
			{canManageRemoved ? (
				<div className={`flex justify-end pt-4 ${DATA_TABLE_TOOLBAR_INSET}`}>
					<SegmentedToggle
						value={listScope}
						onChange={setListScope}
						ariaLabel="Filter contracts by active or removed"
						className="w-full max-w-xs"
						tabs={[
							{ value: "active", label: "Active" },
							{ value: "removed", label: "Removed" },
						]}
					/>
				</div>
			) : null}
			{listScope === "active" ? <ContractsStatusTabs files={files} /> : null}
			<div
				className={`flex pt-4 pb-3 ${DATA_TABLE_TOOLBAR_INSET} gap-3 justify-between flex-wrap`}
			>
				{listScope === "active" ? (
					<ContractsTopControls files={files} />
				) : (
					<p className="text-sm text-slate-600">
						Soft-deleted contracts. Restore to return them to the active list.
					</p>
				)}
				{listScope === "active" ? (
					<div className="platform-overview-actions flex items-center gap-2 justify-end flex-wrap">
						<ContractsViewToggle />
						<ContractsSavedViews />
						<ContractsFilter
							departments={departments}
							assignedManagers={assignedManagers}
						/>
						<Sort />
					</div>
				) : null}
			</div>
			{listScope === "active" ? <ContractsFilterChips /> : null}
		</div>
	);
}
