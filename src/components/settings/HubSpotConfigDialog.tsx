"use client";

import { ArrowRight, Info, RotateCcw, Save, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CrmDealProperty, CrmFieldMap, CrmIntegrationConfig, CrmPipeline } from "@/lib/crm/types";
import {
	CRM_FIELD_MAP_HINTS,
	CRM_FIELD_MAP_KEYS,
	CRM_FIELD_MAP_LABELS,
	DEFAULT_CRM_FIELD_MAP,
	optionsForCrmFieldMapKey,
} from "@/lib/crm/types";

interface HubSpotConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: string;
	pipelineId: string;
	triggerStageId: string;
	fieldMap?: CrmFieldMap | null;
	onSaved: (config: CrmIntegrationConfig) => void;
}

export default function HubSpotConfigDialog({
	open,
	onOpenChange,
	orgId,
	pipelineId,
	triggerStageId,
	fieldMap,
	onSaved,
}: HubSpotConfigDialogProps) {
	const { toast } = useToast();
	const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
	const [dealProperties, setDealProperties] = useState<CrmDealProperty[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedPipeline, setSelectedPipeline] = useState(pipelineId);
	const [selectedStage, setSelectedStage] = useState(triggerStageId);
	const [mapDraft, setMapDraft] = useState<CrmFieldMap>({
		...DEFAULT_CRM_FIELD_MAP,
	});

	useEffect(() => {
		if (!open) return;
		setSelectedPipeline(pipelineId);
		setSelectedStage(triggerStageId);
		setMapDraft({ ...DEFAULT_CRM_FIELD_MAP, ...(fieldMap || {}) });
		setLoading(true);

		const headers = { "x-org-id": orgId };
		const orgQuery = `orgId=${encodeURIComponent(orgId)}`;

		void Promise.allSettled([
			fetch(`/api/crm/hubspot/pipelines?${orgQuery}`, { headers }).then(
				(res) => (res.ok ? res.json() : Promise.reject(res)),
			),
			fetch(`/api/crm/hubspot/properties?${orgQuery}`, { headers }).then(
				(res) => (res.ok ? res.json() : Promise.reject(res)),
			),
		])
			.then(([pipelineResult, propertyResult]) => {
				if (pipelineResult.status === "fulfilled") {
					setPipelines(pipelineResult.value.pipelines || []);
				} else {
					toast({
						title: "Could not load pipelines",
						description: "Reconnect HubSpot if this keeps failing.",
						variant: "destructive",
					});
				}
				if (propertyResult.status === "fulfilled") {
					setDealProperties(propertyResult.value.properties || []);
				} else {
					setDealProperties([]);
				}
			})
			.finally(() => setLoading(false));
	}, [open, orgId, pipelineId, triggerStageId, fieldMap, toast]);

	const stages =
		pipelines.find((pipeline) => pipeline.id === selectedPipeline)?.stages || [];

	const propertyOptionsByKey = useMemo(() => {
		const result = {} as Record<keyof CrmFieldMap, CrmDealProperty[]>;
		for (const key of CRM_FIELD_MAP_KEYS) {
			// Each row only lists HubSpot props that match that field's type
			result[key] = optionsForCrmFieldMapKey(key, dealProperties, mapDraft[key]);
		}
		return result;
	}, [dealProperties, mapDraft]);

	const usePropertyDropdowns = dealProperties.length > 0;

	const selectedPropertyLabel = (key: keyof CrmFieldMap) => {
		const name = mapDraft[key];
		const match = propertyOptionsByKey[key].find((property) => property.name === name);
		return match?.label || name;
	};

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
					fieldMap: mapDraft,
					enabled: true,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Save failed");

			// Close immediately — don't wait on parent refresh or toast paint
			onOpenChange(false);
			onSaved(data.config as CrmIntegrationConfig);
			toast({
				title: "HubSpot config saved",
				description:
					"Trigger stage and field mapping apply to new drafts and Sync now.",
			});
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
							HubSpot trigger & mapping
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						HubSpot deals open CAALM drafts. Choose when that happens, then which
						HubSpot properties fill each draft field.
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
					<div className="space-y-4">
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
							<p className="text-xs text-slate-500 mt-0.5 mb-1">
								When a deal enters this stage, CAALM creates a draft contract.
							</p>
							<Select
								value={selectedStage}
								onValueChange={setSelectedStage}
								disabled={loading || !selectedPipeline}
							>
								<SelectTrigger className="border-[0.25px] border-slate-300">
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

					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Property mapping (HubSpot → CAALM)
							</p>
							<p className="text-xs text-slate-600 mt-1 max-w-4xl">
								You are choosing <span className="font-medium text-slate-700">property names</span>
								{" "}(the HubSpot field labels), not values from a specific deal. Dollar
								amounts and names still live on each deal in HubSpot; CAALM copies them
								when a draft is created.
							</p>
						</div>

						<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/10 border border-blue/20">
							<Info className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
							<p className="text-xs text-slate-700">
								Example: map <span className="font-medium">Amount</span> to HubSpot’s{" "}
								<span className="font-medium">Amount</span> property (
								<span className="tabular-nums">amount</span>). Leave defaults unless
								your portal stores deal value under a custom property.
							</p>
						</div>

						<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
							{/* Column headers — make the direction obvious */}
							<div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] gap-2 items-center px-1">
								<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
									CAALM draft field
								</p>
								<span className="w-4" aria-hidden />
								<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
									Copy from HubSpot property
								</p>
							</div>

							{CRM_FIELD_MAP_KEYS.map((key) => (
								<div
									key={key}
									className="rounded-md border border-slate-200 bg-slate-50/80 p-3 space-y-2"
								>
									<div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] gap-2 sm:items-center">
										<div className="min-w-0">
											<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:hidden mb-1">
												CAALM draft field
											</p>
											<Label
												htmlFor={`hubspot-map-${key}`}
												className="text-sm font-medium text-slate-700"
											>
												{CRM_FIELD_MAP_LABELS[key]}
											</Label>
											<p className="text-xs text-slate-500 mt-0.5">
												{CRM_FIELD_MAP_HINTS[key]}
											</p>
										</div>

										<div className="hidden sm:flex justify-center text-slate-400" aria-hidden>
											<ArrowRight className="h-4 w-4" />
										</div>

										<div className="min-w-0">
											<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:hidden mb-1">
												Copy from HubSpot property
											</p>
											{usePropertyDropdowns ? (
												<Select
													value={mapDraft[key] || undefined}
													onValueChange={(value) =>
														setMapDraft((current) => ({
															...current,
															[key]: value,
														}))
													}
													disabled={loading}
												>
													<SelectTrigger
														id={`hubspot-map-${key}`}
														className="w-full max-w-full min-w-0 overflow-hidden border-[0.25px] border-slate-300 bg-white data-[placeholder]:text-slate-400 [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate"
													>
														<SelectValue
															placeholder={`Pick property (e.g. ${selectedPropertyLabel(key) || DEFAULT_CRM_FIELD_MAP[key]})`}
														>
															<span className="block truncate text-left text-sm text-slate-700">
																{selectedPropertyLabel(key)}
															</span>
														</SelectValue>
													</SelectTrigger>
													<SelectContent className="w-[min(100vw-2rem,32rem)] max-w-[min(100vw-2rem,32rem)]">
														{propertyOptionsByKey[key].map((property) => (
															<SelectItem
																key={`${key}-${property.name}`}
																value={property.name}
																className="items-start py-2"
																title={property.label}
															>
																<span className="block whitespace-normal break-words text-left text-slate-700 leading-snug">
																	{property.label}
																</span>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<Input
													id={`hubspot-map-${key}`}
													className="border-[0.25px] border-slate-300 bg-white placeholder:text-slate-400"
													value={
														mapDraft[key] === DEFAULT_CRM_FIELD_MAP[key]
															? ""
															: mapDraft[key]
													}
													onChange={(event) =>
														setMapDraft((current) => ({
															...current,
															[key]: event.target.value,
														}))
													}
													placeholder={`HubSpot property name (e.g. ${DEFAULT_CRM_FIELD_MAP[key]})`}
													spellCheck={false}
													autoComplete="off"
												/>
											)}
										</div>
									</div>
								</div>
							))}

							<div className="flex justify-end pt-1">
								<Button
									type="button"
									className="btn-primary px-3 sm:px-4 cursor-pointer"
									onClick={() => setMapDraft({ ...DEFAULT_CRM_FIELD_MAP })}
								>
									<RotateCcw className="h-4 w-4" />
									Reset to defaults
								</Button>
							</div>
						</div>
					</div>
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="btn-primary px-3 sm:px-4"
						onClick={handleSave}
						disabled={saving || !selectedPipeline || !selectedStage}
					>
						<Save className="h-4 w-4" />
						Save config
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
