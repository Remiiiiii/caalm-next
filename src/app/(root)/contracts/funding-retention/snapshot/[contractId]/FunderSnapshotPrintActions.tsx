"use client";

import { FileDown, Printer } from "lucide-react";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";

export function FunderSnapshotPrintActions({
	contractId,
}: {
	contractId: string;
}) {
	const [openCsv, opening] = useBusyAction(() =>
		window.open(
			`/api/funding/grants/${encodeURIComponent(contractId)}/funder-snapshot?format=xlsx`,
			"_blank",
		),
	);
	return (
		<div className="flex items-center justify-end gap-3">
			<Button
				type="button"
				variant="outline"
				className="px-3 sm:px-4"
				disabled={opening}
				onClick={() => void openCsv()}
			>
				<BusyIcon busy={opening} icon={FileDown} />
				Download Excel
			</Button>
			<Button
				type="button"
				className="primary-btn px-3 sm:px-4"
				onClick={() => window.print()}
			>
				<Printer className="h-4 w-4" />
				Print / PDF
			</Button>
		</div>
	);
}
