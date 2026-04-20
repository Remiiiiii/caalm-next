"use client";

import type { License } from "@/types/licenses";
import LicensesTopControls from "./LicensesTopControls";
import { LicensesViewToggle } from "./LicensesViewToggle";
import Sort from "./Sort";

interface LicensesControlBarProps {
	licenses: License[];
}

export default function LicensesControlBar({
	licenses,
}: LicensesControlBarProps) {
	return (
		<div className="w-full">
			{/* Main Control Bar */}
			<div className="glass-card">
				{/* Professional Cap */}
				<div className="glass-card-cap" />
				{/* Control Bar Content */}
				<div className="flex pt-6 pb-4 px-6 gap-4 justify-between h-22">
					<LicensesTopControls licenses={licenses} />
					<div className="flex items-center gap-2 justify-end">
						<Sort />
						<LicensesViewToggle />
					</div>
				</div>
			</div>
		</div>
	);
}
