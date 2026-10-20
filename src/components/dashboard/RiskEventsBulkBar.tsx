"use client";

import { Download } from "lucide-react";
import type { RefObject } from "react";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { BusyIcon } from "@/components/ui/busy-icon";
import { useBusyAction } from "@/hooks/useBusyAction";

/** Event register actions on the shared floating dock. */
export function RiskEventsBulkBar({
	count,
	anchorRef,
	onExport,
	onClear,
}: {
	count: number;
	anchorRef?: RefObject<HTMLElement | null>;
	onExport: () => void;
	onClear: () => void;
}) {
	const [runExport, exporting] = useBusyAction(onExport);
	return (
		<BulkActionDock
			count={count}
			noun="event"
			anchorRef={anchorRef}
			onClear={onClear}
		>
			<button
				type="button"
				disabled={exporting}
				onClick={() => void runExport()}
				className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			>
				<BusyIcon busy={exporting} icon={Download} />
				Export selected
			</button>
		</BulkActionDock>
	);
}
