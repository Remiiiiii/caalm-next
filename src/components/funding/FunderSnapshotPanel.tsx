"use client";

import Link from "next/link";
import { FileDown, FileText } from "lucide-react";
import type { RetentionStream } from "@/lib/funding/types";
import { contractRequiresFundId } from "@/lib/funding/grant-fund";
import { Button } from "@/components/ui/button";

export function FunderSnapshotPanel({ stream }: { stream: RetentionStream }) {
	if (!contractRequiresFundId(stream.contractType)) return null;

	const base = `/contracts/funding-retention/snapshot/${encodeURIComponent(stream.contractId)}`;
	const csv = `/api/funding/grants/${encodeURIComponent(stream.contractId)}/funder-snapshot?format=csv`;

	return (
		<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
			<p className="text-sm font-medium sidebar-gradient-text">Funder snapshot</p>
			<p className="text-xs text-slate-600">
				One-pager for program officers: fund, restrictions, budget vs actual,
				linked gifts, and approved volunteer hours tagged to this grant.
			</p>
			<div className="flex flex-wrap justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					className="px-3 sm:px-4"
					onClick={() => window.open(csv, "_blank")}
				>
					<FileDown className="h-4 w-4" />
					Download CSV
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
