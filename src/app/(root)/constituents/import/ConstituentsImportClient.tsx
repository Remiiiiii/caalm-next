"use client";

import { Check, Loader2, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { parseCsvText } from "@/lib/constituents/import/csv";
import {
	IMPORT_FIELD_KEYS,
	IMPORT_FIELD_LABELS,
	listUnknownCsvHeaders,
	type ImportFieldKey,
} from "@/lib/constituents/import/fields";
import { applyColumnMapping } from "@/lib/constituents/import/dry-run";

export function ConstituentsImportClient() {
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<Record<string, string>[]>([]);
	const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>(
		{},
	);
	const [dryRunResult, setDryRunResult] = useState<{
		batchId: string;
		counts: Record<string, number>;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const unknownColumns = useMemo(
		() => listUnknownCsvHeaders(headers, mapping),
		[headers, mapping],
	);

	const previewRows = useMemo(() => {
		if (!rows.length) return [];
		return applyColumnMapping(rows.slice(0, 5), mapping);
	}, [rows, mapping]);

	const onFile = async (file: File | null) => {
		setDryRunResult(null);
		setMessage(null);
		if (!file) return;
		const text = await file.text();
		const parsed = parseCsvText(text);
		setHeaders(parsed.headers);
		setRows(parsed.rows);
		const initial: Record<string, ImportFieldKey | ""> = {};
		for (const header of parsed.headers) {
			const guess = IMPORT_FIELD_KEYS.find(
				(key) => key.toLowerCase() === header.trim().toLowerCase(),
			);
			initial[header] = guess ?? "";
		}
		setMapping(initial);
	};

	const runDryRun = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const res = await fetch("/api/constituents/import?dryRun=1", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rows, mapping }),
			});
			const json = await res.json();
			if (!res.ok) {
				setMessage(json.error ?? "Dry-run failed");
				return;
			}
			setDryRunResult({ batchId: json.batchId, counts: json.counts });
		} finally {
			setBusy(false);
		}
	};

	const commit = async () => {
		if (!dryRunResult?.batchId) return;
		setBusy(true);
		setMessage(null);
		try {
			const res = await fetch("/api/constituents/import/commit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ batchId: dryRunResult.batchId }),
			});
			const json = await res.json();
			if (!res.ok) {
				setMessage(json.error ?? "Commit failed");
				return;
			}
			setMessage(
				json.alreadyCommitted
					? "Batch was already committed (no duplicate writes)."
					: "Import committed successfully.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<Label htmlFor="csv-upload">CSV file</Label>
					<input
						id="csv-upload"
						type="file"
						accept=".csv,text/csv"
						className="block text-sm text-slate-700"
						onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
					/>
					<p className="text-xs text-slate-600">
						Parsed locally in your browser session ({rows.length} data row
						{rows.length === 1 ? "" : "s"}).
					</p>
				</CardContent>
			</Card>

			{headers.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-4">
						<p className="text-sm font-medium sidebar-gradient-text">
							Column mapping
						</p>
						{unknownColumns.length > 0 ? (
							<p className="text-sm text-orange">
								Unmapped columns: {unknownColumns.join(", ")}
							</p>
						) : (
							<p className="text-sm text-slate-600">Every column is mapped.</p>
						)}
						<ul className="space-y-3">
							{headers.map((header) => (
								<li
									key={header}
									className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center"
								>
									<span className="text-sm text-slate-700">{header}</span>
									<Select
										value={mapping[header] || "skip"}
										onValueChange={(value) =>
											setMapping((prev) => ({
												...prev,
												[header]:
													value === "skip" ? "" : (value as ImportFieldKey),
											}))
										}
									>
										<SelectTrigger className="border-[0.25px] border-slate-300">
											<SelectValue placeholder="Skip column" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="skip">Skip column</SelectItem>
											{IMPORT_FIELD_KEYS.map((key) => (
												<SelectItem key={key} value={key}>
													{IMPORT_FIELD_LABELS[key]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			{previewRows.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text mb-3">
							Preview (first rows)
						</p>
						<pre className="text-xs text-slate-700 overflow-x-auto bg-white rounded-lg border border-slate-200 p-3">
							{JSON.stringify(previewRows, null, 2)}
						</pre>
					</CardContent>
				</Card>
			) : null}

			<div className="flex flex-wrap justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					className="px-3 sm:px-4"
					disabled={!rows.length || busy}
					onClick={() => void runDryRun()}
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Play className="h-4 w-4" />
					)}
					Dry-run import
				</Button>
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					disabled={!dryRunResult?.batchId || busy}
					onClick={() => void commit()}
				>
					<Check className="h-4 w-4" />
					Commit batch
				</Button>
			</div>

			{dryRunResult ? (
				<p className="text-sm text-slate-700 tabular-nums">
					Dry-run: {dryRunResult.counts.create} create,{" "}
					{dryRunResult.counts.update} update, {dryRunResult.counts.duplicate}{" "}
					duplicate, {dryRunResult.counts.error} error
				</p>
			) : null}
			{message ? <p className="text-sm text-slate-600">{message}</p> : null}
		</div>
	);
}
