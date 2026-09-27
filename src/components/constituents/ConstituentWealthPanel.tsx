"use client";

import { FileUp, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const FIELD_KEYS = [
	"constituentId",
	"capacityBand",
	"externalScore",
	"screenDate",
	"source",
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return { headers: [], rows: [] };
	const headers = lines[0].split(",").map((h) => h.trim());
	const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
	return { headers, rows };
}

export function ConstituentWealthPanel({
	constituentId,
}: {
	constituentId: string;
}) {
	const [csvText, setCsvText] = useState("");
	const [headers, setHeaders] = useState<string[]>([]);
	const [previewRows, setPreviewRows] = useState<string[][]>([]);
	const [columnMap, setColumnMap] = useState<Partial<Record<FieldKey, string>>>(
		{},
	);
	const [status, setStatus] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onFile = useCallback(async (file: File | null) => {
		if (!file) return;
		const text = await file.text();
		setCsvText(text);
		const parsed = parseCsv(text);
		setHeaders(parsed.headers);
		setPreviewRows(parsed.rows.slice(0, 5));
		const auto: Partial<Record<FieldKey, string>> = {};
		for (const header of parsed.headers) {
			const lower = header.toLowerCase();
			if (lower.includes("constituent")) auto.constituentId = header;
			if (lower.includes("capacity")) auto.capacityBand = header;
			if (lower.includes("score")) auto.externalScore = header;
			if (lower.includes("date")) auto.screenDate = header;
			if (lower.includes("source")) auto.source = header;
		}
		setColumnMap(auto);
	}, []);

	const submitImport = async () => {
		if (!columnMap.constituentId) {
			setStatus("Map a column to Constituent ID before importing.");
			return;
		}
		const parsed = parseCsv(csvText);
		const rows = parsed.rows.map((cells) => {
			const record: Record<string, string | number | undefined> = {};
			for (const key of FIELD_KEYS) {
				const header = columnMap[key];
				if (!header) continue;
				const idx = parsed.headers.indexOf(header);
				if (idx < 0) continue;
				const value = cells[idx];
				if (key === "capacityBand") {
					const num = Number(value);
					if (Number.isFinite(num)) record.capacityBand = num;
				} else {
					record[key] = value;
				}
			}
			if (!record.constituentId) {
				record.constituentId = constituentId;
			}
			return record;
		});

		setSubmitting(true);
		setStatus(null);
		try {
			const res = await fetch("/api/constituents/wealth-import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rows }),
			});
			const json = await res.json();
			if (!res.ok) {
				setStatus(json.error || "Import failed");
				return;
			}
			setStatus(
				`Imported ${json.imported} row(s). Rejected ${json.rejected?.length ?? 0}.`,
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<div className="flex items-center gap-3">
					<FileUp className="w-5 h-5 text-[#0f5384]" />
					<p className="text-sm font-medium sidebar-gradient-text">
						Constituent wealth
					</p>
				</div>
				<p className="text-xs text-slate-600">
					Import a capacity screen CSV from DonorSearch or iWave. CAALM stores
					the result and who imported it; we do not scrape wealth data.
				</p>
				<div className="space-y-2">
					<Label htmlFor="wealth-csv">CSV file</Label>
					<Input
						id="wealth-csv"
						type="file"
						accept=".csv,text/csv"
						className="border-[0.25px] border-slate-300"
						onChange={(e) => onFile(e.target.files?.[0] ?? null)}
					/>
				</div>
				{headers.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{FIELD_KEYS.map((key) => (
							<div key={key} className="space-y-1">
								<Label>{key}</Label>
								<Select
									value={columnMap[key] ?? ""}
									onValueChange={(value) =>
										setColumnMap((prev) => ({ ...prev, [key]: value }))
									}
								>
									<SelectTrigger className="border-[0.25px] border-slate-300">
										<SelectValue placeholder="Choose column" />
									</SelectTrigger>
									<SelectContent>
										{headers.map((header) => (
											<SelectItem key={header} value={header}>
												{header}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						))}
					</div>
				) : null}
				{previewRows.length > 0 ? (
					<p className="text-xs text-slate-500">
						Previewing {previewRows.length} row(s) from the file.
					</p>
				) : null}
				<div className="flex justify-end">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={submitting || !csvText}
						onClick={submitImport}
					>
						<Upload className="h-4 w-4" />
						Import screen
					</Button>
				</div>
				{status ? <p className="text-sm text-slate-600">{status}</p> : null}
			</CardContent>
		</Card>
	);
}
