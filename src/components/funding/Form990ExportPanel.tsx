"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultRange(): { start: string; end: string } {
	const end = new Date();
	const start = new Date(end);
	start.setMonth(start.getMonth() - 3);
	return {
		start: start.toISOString().slice(0, 10),
		end: end.toISOString().slice(0, 10),
	};
}

export function Form990ExportPanel() {
	const [range, setRange] = useState(defaultRange);
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState<string | null>(null);

	const download = async (part: "worksheet" | "exceptions") => {
		setError(null);
		const params = new URLSearchParams({
			startDate: range.start,
			endDate: range.end,
			part,
		});
		const res = await fetch(`/api/funding/form-990-export?${params.toString()}`);
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			setError(body.error || "Export failed");
			return;
		}
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download =
			part === "exceptions"
				? "990-worksheet-exceptions.csv"
				: "990-part-ix-worksheet.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	const refreshMeta = async () => {
		setError(null);
		const params = new URLSearchParams({
			startDate: range.start,
			endDate: range.end,
			part: "meta",
		});
		const res = await fetch(`/api/funding/form-990-export?${params.toString()}`);
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			setError(body.error || "Could not summarize export");
			return;
		}
		const json = (await res.json()) as {
			taggedLineCount: number;
			worksheetRowCount: number;
			exceptionCount: number;
		};
		setMeta(
			`${json.worksheetRowCount + json.exceptionCount} tagged lines in range (${json.worksheetRowCount} mapped, ${json.exceptionCount} exceptions).`,
		);
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
			<p className="text-sm font-medium sidebar-gradient-text">
				990 Part IX worksheet export
			</p>
			<p className="text-xs text-slate-600">
				CSV for your tax preparer — not an IRS e-file. Unmapped categories export
				on the exceptions file.
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<Label className="text-xs text-slate-600">Start date</Label>
					<Input
						type="date"
						value={range.start}
						onChange={(e) =>
							setRange((r) => ({ ...r, start: e.target.value }))
						}
						className="border-[0.25px] border-slate-300"
					/>
				</div>
				<div>
					<Label className="text-xs text-slate-600">End date</Label>
					<Input
						type="date"
						value={range.end}
						onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
						className="border-[0.25px] border-slate-300"
					/>
				</div>
			</div>
			{error ? <p className="text-sm text-red">{error}</p> : null}
			{meta ? <p className="text-xs text-slate-600">{meta}</p> : null}
			<div className="flex flex-wrap justify-end gap-3">
				<Button type="button" variant="outline" onClick={() => void refreshMeta()}>
					Preview counts
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => void download("exceptions")}
				>
					<Download className="h-4 w-4" />
					Exceptions CSV
				</Button>
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					onClick={() => void download("worksheet")}
				>
					<Download className="h-4 w-4" />
					Worksheet CSV
				</Button>
			</div>
		</div>
	);
}
