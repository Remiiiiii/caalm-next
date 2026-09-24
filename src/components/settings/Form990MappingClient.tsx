"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FinanceScopeHelp } from "@/components/funding/FinanceScopeHelp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FORM_990_KNOWN_SOURCES } from "@/lib/funding/form-990/mapping-sources";
import {
	FORM_990_PART_IX_BUCKETS,
	type Form990ExpenseMapping,
	type Form990PartIxBucket,
} from "@/lib/funding/form-990/types";
import { FORM_990_SETTINGS_INTRO } from "@/lib/funding/finance-scope-copy";

function bucketLabel(bucket: Form990PartIxBucket): string {
	switch (bucket) {
		case "program":
			return "Program services";
		case "management":
			return "Management & general";
		case "fundraising":
			return "Fundraising";
		default:
			return bucket;
	}
}

export function Form990MappingClient() {
	const [mappings, setMappings] = useState<Form990ExpenseMapping[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingKey, setSavingKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/funding/form-990-mappings");
			if (!res.ok) throw new Error("Could not load mappings");
			const json = (await res.json()) as { items: Form990ExpenseMapping[] };
			setMappings(json.items ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Load failed");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const mappingFor = (sourceType: string, sourceKey: string) =>
		mappings.find(
			(m) => m.sourceType === sourceType && m.sourceKey === sourceKey,
		)?.partIxBucket;

	const saveMapping = async (
		sourceType: string,
		sourceKey: string,
		partIxBucket: Form990PartIxBucket,
	) => {
		const key = `${sourceType}:${sourceKey}`;
		setSavingKey(key);
		setError(null);
		try {
			const res = await fetch("/api/funding/form-990-mappings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sourceType, sourceKey, partIxBucket }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Save failed");
			}
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Save failed");
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<div className="space-y-6">
			<FinanceScopeHelp />
			<p className="text-sm text-slate-600 max-w-4xl">{FORM_990_SETTINGS_INTRO}</p>
			{error ? <p className="text-sm text-red">{error}</p> : null}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">
						990 Part IX worksheet mapping
					</p>
					{loading ? (
						<p className="text-sm text-slate-600">Loading mappings…</p>
					) : (
						<ul className="space-y-3">
							{FORM_990_KNOWN_SOURCES.map((source) => {
								const current = mappingFor(source.sourceType, source.sourceKey);
								const rowKey = `${source.sourceType}:${source.sourceKey}`;
								return (
									<li
										key={rowKey}
										className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-lg border border-slate-200 bg-white p-3"
									>
										<span className="text-sm text-slate-700">{source.label}</span>
										<div className="flex items-center gap-2">
											<Select
												value={current ?? ""}
												onValueChange={(value) =>
													void saveMapping(
														source.sourceType,
														source.sourceKey,
														value as Form990PartIxBucket,
													)
												}
											>
												<SelectTrigger className="w-[220px] border-[0.25px] border-slate-300">
													<SelectValue placeholder="Unmapped" />
												</SelectTrigger>
												<SelectContent>
													{FORM_990_PART_IX_BUCKETS.map((bucket) => (
														<SelectItem key={bucket} value={bucket}>
															{bucketLabel(bucket)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{savingKey === rowKey ? (
												<Save className="h-4 w-4 text-slate-400 animate-pulse" />
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
			<div className="flex justify-end">
				<Button
					type="button"
					variant="outline"
					className="px-3 sm:px-4"
					onClick={() => void load()}
				>
					<Save className="h-4 w-4" />
					Refresh
				</Button>
			</div>
		</div>
	);
}
