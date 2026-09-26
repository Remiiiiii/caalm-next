"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FunderSnapshotPrintActions({
	contractId,
}: {
	contractId: string;
}) {
	return (
		<div className="flex items-center justify-end gap-3">
			<Button
				type="button"
				variant="outline"
				className="px-3 sm:px-4"
				onClick={() => {
					window.open(
						`/api/funding/grants/${encodeURIComponent(contractId)}/funder-snapshot?format=csv`,
						"_blank",
					);
				}}
			>
				<FileDown className="h-4 w-4" />
				Download CSV
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
