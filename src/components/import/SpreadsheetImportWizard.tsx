"use client";

import { Check, Download, FileUp, Loader2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
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
import { parseSpreadsheetFile } from "@/lib/import/spreadsheet";
import { listUnmappedHeaders } from "@/lib/import/mapping";

export type SpreadsheetDryRunState = {
	counts: Record<string, number>;
	rows?: { rowNumber: number; action: string; reason?: string }[];
	rowErrors?: { rowNumber: number; message: string }[];
	batchId?: string;
};

type SpreadsheetImportWizardProps<K extends string> = {
	title: string;
	description: string;
	fieldKeys: readonly K[];
	fieldLabels: Record<K, string>;
	guessField: (header: string) => K | "";
	requiredKeys?: readonly K[];
	sampleCsv: string;
	sampleFilename: string;
	importUrl: string;
	commitUrl?: string;
	commitUsesBatchId?: boolean;
	commitLabel: string;
	banner?: ReactNode;
	onImported?: () => void;
};

function commitCount(counts: Record<string, number>): number {
	return (counts.create ?? 0) + (counts.update ?? 0) + (counts.invite ?? 0);
}

export function SpreadsheetImportWizard<K extends string>({
	title,
	description,
	fieldKeys,
	fieldLabels,
	guessField,
	requiredKeys,
	sampleCsv,
	sampleFilename,
	importUrl,
	commitUrl,
	commitUsesBatchId = false,
	commitLabel,
	banner,
	onImported,
}: SpreadsheetImportWizardProps<K>) {
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<Record<string, string>[]>([]);
	const [mapping, setMapping] = useState<Record<string, K | "">>({});
	const [dryRun, setDryRun] = useState<SpreadsheetDryRunState | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const unmapped = useMemo(
		() => listUnmappedHeaders(headers, mapping),
		[headers, mapping],
	);

	const requiredMapped = useMemo(() => {
		if (!requiredKeys?.length) return true;
		const targets = new Set(Object.values(mapping).filter(Boolean));
		return requiredKeys.every((key) => targets.has(key));
	}, [mapping, requiredKeys]);

	const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

	const onFile = async (file: File | null) => {
		setDryRun(null);
		setMessage(null);
		if (!file) return;
		try {
			const parsed = await parseSpreadsheetFile(file);
			setHeaders(parsed.headers);
			setRows(parsed.rows);
			const initial: Record<string, K | ""> = {};
			for (const header of parsed.headers) {
				initial[header] = guessField(header);
			}
			setMapping(initial);
		} catch (error) {
			setHeaders([]);
			setRows([]);
			setMapping({});
			setMessage(
				error instanceof Error ? error.message : "Could not read that file",
			);
		}
	};

	const downloadSample = () => {
		const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = sampleFilename;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const runDryRun = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const res = await fetch(`${importUrl}?dryRun=1`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rows, mapping }),
			});
			const json = await res.json();
			if (!res.ok) {
				setMessage(json.error ?? "Preview failed");
				return;
			}
			setDryRun({
				counts: json.counts ?? {},
				rows: json.rows,
				rowErrors: json.rowErrors ?? [],
				batchId: json.batchId,
			});
		} finally {
			setBusy(false);
		}
	};

	const commitImport = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const url = commitUrl || importUrl;
			const body = commitUsesBatchId
				? { batchId: dryRun?.batchId }
				: { rows, mapping };
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!res.ok) {
				setMessage(json.error ?? "Import failed");
				return;
			}
			const created = json.createdCount ?? json.counts?.create ?? 0;
			const updated = json.updatedCount ?? json.counts?.update ?? 0;
			const invited = json.invitedCount ?? json.counts?.invite ?? 0;
			const skipped = json.skippedCount ?? json.counts?.skip ?? 0;
			const failed = json.failedCount ?? json.counts?.error ?? 0;
			setMessage(
				`Imported ${created} create, ${updated} update, ${invited} invite; skipped ${skipped}; errors ${failed}.`,
			);
			setDryRun(null);
			setHeaders([]);
			setRows([]);
			setMapping({});
			onImported?.();
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			{banner}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
						<p className="text-xs text-slate-600 mt-1">{description}</p>
					</div>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div className="space-y-1 min-w-[200px] flex-1">
							<Label htmlFor="spreadsheet-upload">Spreadsheet file</Label>
							<input
								id="spreadsheet-upload"
								type="file"
								accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
								className="block w-full text-sm text-slate-700"
								onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
							/>
							<p className="text-xs text-slate-600">
								{rows.length} data row{rows.length === 1 ? "" : "s"} loaded in
								this browser session (CSV or Excel).
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							className="px-3 sm:px-4 shrink-0"
							onClick={downloadSample}
						>
							<Download className="h-4 w-4" />
							Sample template
						</Button>
					</div>
				</CardContent>
			</Card>

			{headers.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-4">
						<p className="text-sm font-medium sidebar-gradient-text">
							Column mapping
						</p>
						{unmapped.length > 0 ? (
							<p className="text-sm text-orange">
								Unmapped columns (optional): {unmapped.join(", ")}
							</p>
						) : null}
						{!requiredMapped ? (
							<p className="text-sm text-red">
								Map every required column before importing.
							</p>
						) : (
							<p className="text-sm text-slate-600">
								Required columns are mapped.
							</p>
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
												[header]: value === "skip" ? "" : (value as K),
											}))
										}
									>
										<SelectTrigger className="border-[0.25px] border-slate-300">
											<SelectValue placeholder="Skip column" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="skip">Skip column</SelectItem>
											{fieldKeys.map((key) => (
												<SelectItem key={key} value={key}>
													{fieldLabels[key]}
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
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Preview (first rows)
						</p>
						<pre className="text-xs text-slate-700 overflow-x-auto bg-white rounded-lg border border-slate-200 p-3">
							{JSON.stringify(previewRows, null, 2)}
						</pre>
					</CardContent>
				</Card>
			) : null}

			{dryRun ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Import preview
						</p>
						<p className="text-sm text-slate-600 tabular-nums">
							Create {dryRun.counts.create ?? 0}, update{" "}
							{dryRun.counts.update ?? 0}, invite {dryRun.counts.invite ?? 0},
							skip {dryRun.counts.skip ?? 0}, error {dryRun.counts.error ?? 0}.
						</p>
						{dryRun.rowErrors && dryRun.rowErrors.length > 0 ? (
							<ul className="text-xs text-orange space-y-1">
								{dryRun.rowErrors.slice(0, 20).map((err) => (
									<li key={`${err.rowNumber}-${err.message}`}>
										Row {err.rowNumber}: {err.message}
									</li>
								))}
							</ul>
						) : null}
					</CardContent>
				</Card>
			) : null}

			{message ? (
				<p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 p-3">
					{message}
				</p>
			) : null}

			<div className="flex flex-wrap justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					className="px-3 sm:px-4"
					disabled={!rows.length || !requiredMapped || busy}
					onClick={() => void runDryRun()}
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<FileUp className="h-4 w-4" />
					)}
					Preview import
				</Button>
				<Button
					type="button"
					className="btn-primary px-3 sm:px-4"
					disabled={!dryRun || commitCount(dryRun.counts) === 0 || busy}
					onClick={() => void commitImport()}
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Check className="h-4 w-4" />
					)}
					{commitLabel}
				</Button>
			</div>
		</div>
	);
}
