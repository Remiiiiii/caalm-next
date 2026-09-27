"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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

export function JournalExportDialog() {
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState(defaultRange);
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const download = async (format: "csv" | "iif") => {
		setBusy(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				startDate: range.start,
				endDate: range.end,
				format,
			});
			const res = await fetch(
				`/api/funding/journal-export?${params.toString()}`,
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				setError(body.error || "Export failed");
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `journal-export-${range.start}-${range.end}.${format === "iif" ? "iif" : "csv"}`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setBusy(false);
		}
	};

	const refreshMeta = async () => {
		setError(null);
		const params = new URLSearchParams({
			startDate: range.start,
			endDate: range.end,
			format: "meta",
		});
		const res = await fetch(`/api/funding/journal-export?${params.toString()}`);
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			setError(body.error || "Could not summarize export");
			return;
		}
		const json = (await res.json()) as {
			giftRowCount: number;
			reclassReleaseCount: number;
			giftCashTotal: number;
			rowCount: number;
		};
		setMeta(
			`${json.rowCount} rows (${json.giftRowCount} gifts, ${json.reclassReleaseCount} restriction releases). Gift cash total $${json.giftCashTotal.toFixed(2)}.`,
		);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" className="px-3 sm:px-4">
					<FileSpreadsheet className="h-4 w-4" />
					Journal export
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<FileSpreadsheet className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Journal export
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Download posted gifts and restriction releases for your accounting
						system.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-2">
						<p>
							This is a <strong className="text-slate-700">journal feed</strong>{" "}
							(CSV or IIF download only). It is not a live general ledger, not
							MIP, and not a two-way sync with QuickBooks Online or Sage
							Intacct.
						</p>
						<p>
							Import the file into the ledger your nonprofit already uses. CAALM
							does not post directly to those systems from this export.
						</p>
					</div>
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
								onChange={(e) =>
									setRange((r) => ({ ...r, end: e.target.value }))
								}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
					</div>
					{error ? <p className="text-sm text-red">{error}</p> : null}
					{meta ? <p className="text-xs text-slate-600">{meta}</p> : null}
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						disabled={busy}
						onClick={() => void refreshMeta()}
					>
						Preview counts
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={busy}
						onClick={() => void download("iif")}
					>
						<Download className="h-4 w-4" />
						IIF download
					</Button>
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={busy}
						onClick={() => void download("csv")}
					>
						<Download className="h-4 w-4" />
						CSV download
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
