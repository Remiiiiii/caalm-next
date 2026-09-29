"use client";

import { Check, Download, FileUp, Loader2 } from "lucide-react";
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
	FUND_IMPORT_FIELD_KEYS,
	FUND_IMPORT_FIELD_LABELS,
	guessFundImportField,
	listUnmappedFundHeaders,
	type FundImportFieldKey,
} from "@/lib/funds/import/fields";
import { applyFundColumnMapping } from "@/lib/funds/import/parse";

const SAMPLE_CSV = `fund_code,fund_name,restriction_type
UNRESTRICTED,General operating,Unrestricted
GRANT-2024,Federal capacity grant,Temporarily restricted
ENDOW-01,Board endowment,Permanently restricted
`;

type DryRunState = {
	counts: { create: number; skip: number };
	rows: {
		rowNumber: number;
		action: "create" | "skip";
		code: string;
		reason?: string;
	}[];
	rowErrors: { rowNumber: number; message: string }[];
};

type FundsCsvImportCardProps = {
	onImported: () => void;
};

export function FundsCsvImportCard({ onImported }: FundsCsvImportCardProps) {
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<Record<string, string>[]>([]);
	const [mapping, setMapping] = useState<
		Record<string, FundImportFieldKey | "">
	>({});
	const [dryRun, setDryRun] = useState<DryRunState | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const unmapped = useMemo(
		() => listUnmappedFundHeaders(headers, mapping),
		[headers, mapping],
	);

	const preview = useMemo(() => {
		if (!rows.length) return { valid: [], errors: [] };
		return applyFundColumnMapping(rows.slice(0, 5), mapping);
	}, [rows, mapping]);

	const requiredMapped = useMemo(() => {
		const targets = new Set(Object.values(mapping).filter(Boolean));
		return FUND_IMPORT_FIELD_KEYS.every((key) => targets.has(key));
	}, [mapping]);

	const onFile = async (file: File | null) => {
		setDryRun(null);
		setMessage(null);
		if (!file) return;
		const text = await file.text();
		const parsed = parseCsvText(text);
		setHeaders(parsed.headers);
		setRows(parsed.rows);
		const initial: Record<string, FundImportFieldKey | ""> = {};
		for (const header of parsed.headers) {
			initial[header] = guessFundImportField(header);
		}
		setMapping(initial);
	};

	const downloadSample = () => {
		const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "caalm-funds-import-template.csv";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const runDryRun = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const res = await fetch("/api/funds/import?dryRun=1", {
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
				counts: json.counts,
				rows: json.rows,
				rowErrors: json.rowErrors ?? [],
			});
		} finally {
			setBusy(false);
		}
	};

	const commitImport = async () => {
		setBusy(true);
		setMessage(null);
		try {
			const res = await fetch("/api/funds/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rows, mapping }),
			});
			const json = await res.json();
			if (!res.ok) {
				setMessage(json.error ?? "Import failed");
				return;
			}
			setMessage(
				`Imported ${json.createdCount} fund(s); skipped ${json.skippedCount} existing or duplicate row(s).`,
			);
			setDryRun(null);
			setHeaders([]);
			setRows([]);
			setMapping({});
			onImported();
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							Import from finance (CSV)
						</p>
						<p className="text-xs text-slate-600 mt-1">
							Upload a chart-of-funds export from your finance team. CAALM uses
							these codes for restricted-fund tracking and 990 worksheet
							mapping — not as a general ledger.
						</p>
					</div>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div className="space-y-1 min-w-[200px] flex-1">
							<Label htmlFor="funds-csv-upload">CSV file</Label>
							<input
								id="funds-csv-upload"
								type="file"
								accept=".csv,text/csv"
								className="block w-full text-sm text-slate-700"
								onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
							/>
							<p className="text-xs text-slate-600">
								{rows.length} data row{rows.length === 1 ? "" : "s"} loaded in
								this browser session.
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
								Map fund code, fund name, and net asset class before importing.
							</p>
						) : (
							<p className="text-sm text-slate-600">
								Required finance fields are mapped.
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
												[header]:
													value === "skip" ? "" : (value as FundImportFieldKey),
											}))
										}
									>
										<SelectTrigger className="border-[0.25px] border-slate-300">
											<SelectValue placeholder="Skip column" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="skip">Skip column</SelectItem>
											{FUND_IMPORT_FIELD_KEYS.map((key) => (
												<SelectItem key={key} value={key}>
													{FUND_IMPORT_FIELD_LABELS[key]}
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

			{preview.valid.length > 0 || preview.errors.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Preview (first rows)
						</p>
						{preview.errors.length > 0 ? (
							<ul className="text-xs text-red space-y-1">
								{preview.errors.map((err) => (
									<li key={err.rowNumber}>
										Row {err.rowNumber}: {err.message}
									</li>
								))}
							</ul>
						) : null}
						<pre className="text-xs text-slate-700 overflow-x-auto bg-white rounded-lg border border-slate-200 p-3">
							{JSON.stringify(preview.valid, null, 2)}
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
						<p className="text-sm text-slate-600">
							Will create {dryRun.counts.create} fund
							{dryRun.counts.create === 1 ? "" : "s"}; skip{" "}
							{dryRun.counts.skip} duplicate or existing row
							{dryRun.counts.skip === 1 ? "" : "s"}.
						</p>
						{dryRun.rowErrors.length > 0 ? (
							<ul className="text-xs text-orange space-y-1">
								{dryRun.rowErrors.map((err) => (
									<li key={err.rowNumber}>
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
					className="primary-btn px-3 sm:px-4"
					disabled={!dryRun || dryRun.counts.create === 0 || busy}
					onClick={() => void commitImport()}
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Check className="h-4 w-4" />
					)}
					Import funds
				</Button>
			</div>
		</div>
	);
}
