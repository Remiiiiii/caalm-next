"use client";

import type { License } from "@/types/licenses";
import LicensesFilter from "./LicensesFilter";
import LicensesFilterChips from "./LicensesFilterChips";
import LicensesSavedViews from "./LicensesSavedViews";
import LicensesStatusTabs from "./LicensesStatusTabs";
import LicensesTopControls from "./LicensesTopControls";
import { LicensesViewToggle } from "./LicensesViewToggle";
import { useLicensesView } from "./LicensesView";
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
	const { listAnchorRef } = useLicensesView();

	return (
		<div ref={listAnchorRef} className="w-full scroll-mt-4">
			<LicensesStatusTabs licenses={licenses} />
			<div className="flex pt-4 pb-3 px-4 sm:px-6 gap-3 justify-between flex-wrap">
				<LicensesTopControls licenses={licenses} />
				<div className="flex items-center gap-2 justify-end flex-wrap">
					<LicensesFilter
						departments={departments}
						assignedManagers={assignedManagers}
					/>
					<LicensesSavedViews />
					<Sort />
					<LicensesViewToggle />
				</div>
			</div>
			<LicensesFilterChips />
		</div>
	);
}
