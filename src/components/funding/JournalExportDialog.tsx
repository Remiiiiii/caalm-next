"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { BusyIcon } from "@/components/ui/busy-icon";
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

export function JournalExportDialog() {
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState(defaultRange);
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [busyFormat, setBusyFormat] = useState<"csv" | "iif" | null>(null);

	const download = async (format: "csv" | "iif") => {
		setBusy(true);
		setBusyFormat(format);
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
			setBusyFormat(null);
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
		<>
			<Button
				type="button"
				variant="outline"
				className="px-3 sm:px-4"
				onClick={() => setOpen(true)}
			>
				<FileSpreadsheet className="h-4 w-4" />
				Journal export
			</Button>
			<AppDialog
				open={open}
				onOpenChange={setOpen}
				size="form"
				className="max-h-[90vh]"
				pending={busy}
				icon={<FileSpreadsheet className="h-5 w-5" />}
				title="Journal export"
				description="Download posted gifts and restriction releases for your accounting system."
				footer={
					<>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							disabled={busy}
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
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
							<BusyIcon busy={busyFormat === "iif"} icon={Download} />
							IIF download
						</Button>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							disabled={busy}
							onClick={() => void download("csv")}
						>
							<BusyIcon busy={busyFormat === "csv"} icon={Download} />
							CSV download
						</Button>
					</>
				}
			>
				<div className="flex flex-col gap-4 pb-1">
					<div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
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
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
			</AppDialog>
		</>
	);
}
