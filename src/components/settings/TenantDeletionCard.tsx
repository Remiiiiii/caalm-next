"use client";

import { Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import { TENANT_DELETION_GRACE_DAYS } from "@/lib/portability/tenant-deletion-notice";
import { fetcher } from "@/lib/swr-config";

type OrgResponse = {
	success: boolean;
	data: {
		organization: {
			settings?: {
				deletionScheduledAt?: string;
				deletionRequestedAt?: string;
			};
		};
	};
};

export function TenantDeletionCard({
	orgId,
	canEdit,
}: {
	orgId: string;
	canEdit: boolean;
}) {
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const [busy, setBusy] = useState(false);
	const url = `/api/organizations?orgId=${encodeURIComponent(orgId)}`;
	const { data, mutate } = useSWR<OrgResponse>(url, fetcher);
	const scheduledAt = data?.data?.organization?.settings?.deletionScheduledAt;

	const run = async (method: "POST" | "DELETE") => {
		if (!canEdit) return;
		setBusy(true);
		try {
			if (!(await ensureStepUp())) return;
			const response = await fetch(
				`/api/organizations/data-deletion?orgId=${encodeURIComponent(orgId)}`,
				{ method },
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					typeof body.error === "string" ? body.error : "Request failed",
				);
			}
			await mutate();
			toast({
				title: method === "POST" ? "Deletion scheduled" : "Deletion cancelled",
				description:
					method === "POST"
						? `Org data will be purged after ${TENANT_DELETION_GRACE_DAYS} days unless you cancel.`
						: "Your organization will stay active.",
			});
		} catch (error) {
			toast({
				title: "Could not update deletion",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<GlassCard className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<div className="space-y-2">
					<p className="text-sm font-medium sidebar-gradient-text">
						Tenant deletion
					</p>
					<p className="text-sm text-slate-600">
						Schedule permanent deletion of this organization&apos;s data. There
						is a {TENANT_DELETION_GRACE_DAYS}-day grace period. After that,
						org-scoped rows are purged. A deletion audit event is written and
						kept for the record.
					</p>
					{scheduledAt ? (
						<p className="text-sm text-orange">
							Deletion scheduled for{" "}
							{new Date(scheduledAt).toLocaleString(undefined, {
								dateStyle: "medium",
								timeStyle: "short",
							})}
							.
						</p>
					) : null}
				</div>
				{canEdit ? (
					<div className="flex justify-end gap-3">
						{scheduledAt ? (
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4 cursor-pointer"
								disabled={busy}
								onClick={() => run("DELETE")}
							>
								<Undo2 className="h-4 w-4" />
								{busy ? "Cancelling…" : "Cancel deletion"}
							</Button>
						) : (
							<Button
								type="button"
								className="delete-btn px-3 sm:px-4 cursor-pointer"
								disabled={busy}
								onClick={() => run("POST")}
							>
								<Trash2 className="h-4 w-4" />
								{busy ? "Scheduling…" : "Schedule deletion"}
							</Button>
						)}
					</div>
				) : (
					<p className="text-sm text-slate-500">
						You need permission to edit organization settings to schedule
						deletion.
					</p>
				)}
			</CardContent>
		</GlassCard>
	);
}
