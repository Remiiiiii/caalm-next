"use client";

import { Ban, FileWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowFrozenBannerProps {
	status: string;
	onAttest?: () => void;
	onRenew?: () => void;
	attestPending?: boolean;
}

export function WorkflowFrozenBanner({
	status,
	onAttest,
	onRenew,
	attestPending = false,
}: WorkflowFrozenBannerProps) {
	const expired = status.trim().toLowerCase() === "expired";
	return (
		<div>
			<div className="rounded-xl border border-red/20 bg-red/5 px-4 py-3">
				<div className="flex items-start gap-3">
					<Ban className="mt-0.5 h-5 w-5 shrink-0 text-red" />
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold text-slate-700">
							{expired
								? "This document expired. Approval is closed."
								: "This document is inactive. Approval is closed."}
						</p>
						<p className="mt-1 text-xs text-slate-600">
							Review history stays visible. File why it ended, then renew to
							start a new approval.
						</p>
					</div>
				</div>
			</div>
			{(onAttest || onRenew) && (
				<div className="mt-3 flex flex-wrap justify-end gap-2">
					{onAttest ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={onAttest}
						>
							<FileWarning className="h-4 w-4" />
							{attestPending
								? "File expiration attestation"
								: "View attestation"}
						</Button>
					) : null}
					{onRenew ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={onRenew}
						>
							<RefreshCw className="h-4 w-4" />
							Renew
						</Button>
					) : null}
				</div>
			)}
		</div>
	);
}
