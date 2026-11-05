"use client";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { DATA_TABLE_TOOLBAR_INSET } from "@/lib/ui/data-table-styles";
import type { License } from "@/types/licenses";
import LicensesFilter from "./LicensesFilter";
import LicensesFilterChips from "./LicensesFilterChips";
import LicensesSavedViews from "./LicensesSavedViews";
import LicensesStatusTabs from "./LicensesStatusTabs";
import LicensesTopControls from "./LicensesTopControls";
import { useLicensesView } from "./LicensesView";
import { LicensesViewToggle } from "./LicensesViewToggle";
import Sort from "./Sort";

interface LicensesControlBarProps {
	licenses: License[];
	departments?: string[];
	assignedManagers?: string[];
}

export default function LicensesControlBar({
	licenses,
	departments = [],
	assignedManagers = [],
}: LicensesControlBarProps) {
	const { listAnchorRef, listScope, setListScope } = useLicensesView();
	const { permissions } = usePermissions();
	const canDelete = permissions.includes(PERMISSIONS.LICENSES.DELETE);

	return (
		<div ref={listAnchorRef} className="w-full scroll-mt-4">
			{canDelete ? (
				<div className={`flex justify-end pt-4 ${DATA_TABLE_TOOLBAR_INSET}`}>
					<SegmentedToggle
						value={listScope}
						onChange={setListScope}
						ariaLabel="Filter licenses by active or removed"
						className="w-full max-w-xs"
						tabs={[
							{ value: "active", label: "Active" },
							{ value: "removed", label: "Removed" },
						]}
					/>
				</div>
			) : null}
			{listScope === "active" ? (
				<LicensesStatusTabs licenses={licenses} />
			) : null}
			<div
				className={`flex pt-4 pb-3 ${DATA_TABLE_TOOLBAR_INSET} gap-3 justify-between flex-wrap`}
			>
				{listScope === "active" ? (
					<LicensesTopControls licenses={licenses} />
				) : (
					<p className="text-sm text-slate-600">
						Soft-deleted licenses. Restore to return them to the active list.
					</p>
				)}
				{listScope === "active" ? (
					<div className="platform-overview-actions flex items-center gap-2 justify-end flex-wrap">
						<LicensesFilter
							departments={departments}
							assignedManagers={assignedManagers}
						/>
						<LicensesSavedViews />
						<Sort />
						<LicensesViewToggle />
					</div>
				) : null}
			</div>
			{listScope === "active" ? <LicensesFilterChips /> : null}
		</div>
	);
}
