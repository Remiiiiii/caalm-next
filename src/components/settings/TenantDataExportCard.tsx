"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";

function filenameFromDisposition(
	header: string | null,
	fallback: string,
): string {
	const quoted = header?.match(/filename="([^"]+)"/)?.[1];
	return quoted || fallback;
}

export function TenantDataExportCard({
	orgId,
	canEdit,
}: {
	orgId: string;
	canEdit: boolean;
}) {
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const [exporting, setExporting] = useState(false);

	const handleExport = async () => {
		if (!canEdit) return;
		setExporting(true);
		try {
			if (!(await ensureStepUp())) {
				return;
			}

			const response = await fetch(
				`/api/organizations/data-export?orgId=${encodeURIComponent(orgId)}`,
				{ method: "POST" },
			);
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(
					typeof body.error === "string" ? body.error : "Export failed",
				);
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = filenameFromDisposition(
				response.headers.get("Content-Disposition"),
				`caalm-tenant-export-${orgId}.json`,
			);
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
			toast({ title: "Export downloaded" });
		} catch (error) {
			toast({
				title: "Could not export data",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setExporting(false);
		}
	};

	return (
		<GlassCard className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<div className="space-y-2">
					<p className="text-sm font-medium sidebar-gradient-text">
						Tenant data export
					</p>
					<p className="text-sm text-slate-600">
						Download a machine-readable JSON copy of this organization&apos;s
						database rows: contracts, licenses, tickets, users, and other
						org-scoped records. File attachments are metadata only in this
						version; binaries are not included. Very large exports may fail; if
						that happens, contact support.
					</p>
				</div>
				{canEdit ? (
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							disabled={exporting}
							onClick={handleExport}
						>
							<Download className="h-4 w-4" />
							{exporting ? "Exporting…" : "Download export"}
						</Button>
					</div>
				) : (
					<p className="text-sm text-slate-500">
						You need permission to edit organization settings to run an export.
					</p>
				)}
			</CardContent>
		</GlassCard>
	);
}
