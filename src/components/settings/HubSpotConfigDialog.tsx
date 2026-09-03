"use client";

import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CrmPipeline } from "@/lib/crm/types";

interface HubSpotConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: string;
	pipelineId: string;
	triggerStageId: string;
	onSaved: () => void;
}

export default function HubSpotConfigDialog({
	open,
	onOpenChange,
	orgId,
	pipelineId,
	triggerStageId,
	onSaved,
}: HubSpotConfigDialogProps) {
	const { toast } = useToast();
	const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedPipeline, setSelectedPipeline] = useState(pipelineId);
	const [selectedStage, setSelectedStage] = useState(triggerStageId);

	useEffect(() => {
		if (!open) return;
		setSelectedPipeline(pipelineId);
		setSelectedStage(triggerStageId);
		setLoading(true);
		void fetch(`/api/crm/hubspot/pipelines?orgId=${encodeURIComponent(orgId)}`, {
			headers: { "x-org-id": orgId },
		})
			.then((res) => (res.ok ? res.json() : Promise.reject(res)))
			.then((data) => {
				setPipelines(data.pipelines || []);
			})
			.catch(() => {
				toast({
					title: "Could not load pipelines",
					description: "Reconnect HubSpot if this keeps failing.",
					variant: "destructive",
				});
			})
			.finally(() => setLoading(false));
	}, [open, orgId, pipelineId, triggerStageId, toast]);

	const stages =
		pipelines.find((pipeline) => pipeline.id === selectedPipeline)?.stages || [];

	const handleSave = async () => {
		try {
			setSaving(true);
			const res = await fetch("/api/crm/hubspot/config", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": orgId,
				},
				body: JSON.stringify({
					orgId,
					pipelineId: selectedPipeline,
					triggerStageId: selectedStage,
					enabled: true,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Save failed");
			toast({
				title: "HubSpot trigger saved",
				description: "Deals that enter this stage create a CAALM draft.",
			});
			onSaved();
			onOpenChange(false);
		} catch (error) {
			toast({
				title: "Save failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<Settings2 className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							HubSpot trigger
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						When a deal enters the selected stage, CAALM creates a draft contract.
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div>
						<Label className="text-sm text-slate-700">Pipeline</Label>
						<Select
							value={selectedPipeline}
							onValueChange={(value) => {
								setSelectedPipeline(value);
								setSelectedStage("");
							}}
							disabled={loading}
						>
							<SelectTrigger className="mt-1 border-[0.25px] border-slate-300">
								<SelectValue
									placeholder={loading ? "Loading…" : "Select a pipeline"}
								/>
							</SelectTrigger>
							<SelectContent>
								{pipelines.map((pipeline) => (
									<SelectItem key={pipeline.id} value={pipeline.id}>
										{pipeline.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="text-sm text-slate-700">Trigger stage</Label>
						<Select
							value={selectedStage}
							onValueChange={setSelectedStage}
							disabled={loading || !selectedPipeline}
						>
							<SelectTrigger className="mt-1 border-[0.25px] border-slate-300">
								<SelectValue placeholder="Select a stage" />
							</SelectTrigger>
							<SelectContent>
								{stages.map((stage) => (
									<SelectItem key={stage.id} value={stage.id}>
										{stage.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={handleSave}
						disabled={saving || !selectedPipeline || !selectedStage}
					>
						Save trigger
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
