"use client";

import { FileDown, FileText } from "lucide-react";
import Link from "next/link";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { contractRequiresFundId } from "@/lib/funding/grant-fund";
import type { RetentionStream } from "@/lib/funding/types";

export function FunderSnapshotPanel({ stream }: { stream: RetentionStream }) {
	const csv = `/api/funding/grants/${encodeURIComponent(stream.contractId)}/funder-snapshot?format=xlsx`;
	const [openCsv, opening] = useBusyAction(() => window.open(csv, "_blank"));
	if (!contractRequiresFundId(stream.contractType)) return null;

	const base = `/contracts/funding-retention/snapshot/${encodeURIComponent(stream.contractId)}`;

	return (
		<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
			<p className="text-sm font-medium sidebar-gradient-text">
				Funder snapshot
			</p>
			<p className="text-xs text-slate-600">
				One-pager for program officers: fund, restrictions, budget vs actual,
				linked gifts, and approved volunteer hours tagged to this grant.
			</p>
			<div className="flex flex-wrap justify-end gap-3">
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
				<Button type="button" className="primary-btn px-3 sm:px-4" asChild>
					<Link href={base}>
						<FileText className="h-4 w-4" />
						Print preview
					</Link>
				</Button>
			</div>
		</div>
	);
}
