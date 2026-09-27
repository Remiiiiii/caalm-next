"use client";

import { GitMerge } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import {
	type Constituent,
	constituentDisplayName,
	type MergePreview,
} from "@/lib/constituents";

export function MergeConstituentsDialog({
	open,
	onOpenChange,
	winner,
	onMerged,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	winner: Constituent;
	onMerged: (loserId: string) => void;
}) {
	const [query, setQuery] = useState("");
	const [matches, setMatches] = useState<Constituent[]>([]);
	const [loserId, setLoserId] = useState("");
	const [preview, setPreview] = useState<MergePreview | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		const timer = window.setTimeout(async () => {
			const params = new URLSearchParams({ page: "1", pageSize: "8" });
			if (query.trim()) params.set("search", query.trim());
			const response = await fetch(`/api/constituents?${params.toString()}`);
			const data = await response.json();
			setMatches(
				((data.items || []) as Constituent[]).filter(
					(row) => row.$id !== winner.$id,
				),
			);
		}, 250);
		return () => window.clearTimeout(timer);
	}, [query, open, winner.$id]);

	const reset = () => {
		setQuery("");
		setLoserId("");
		setPreview(null);
		setError(null);
		setSaving(false);
	};

	const loadPreview = async (id: string) => {
		setLoserId(id);
		setPreview(null);
		setError(null);
		const response = await fetch("/api/constituents/merge/preview", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ winnerId: winner.$id, loserId: id }),
		});
		const data = await response.json();
		if (!response.ok) {
			setError(data.error || "Could not preview merge");
			return;
		}
		setPreview(data.preview);
	};

	const commit = async () => {
		if (!loserId) return;
		setSaving(true);
		setError(null);
		try {
			const response = await fetch("/api/constituents/merge", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ winnerId: winner.$id, loserId }),
			});
			const data = await response.json();
			if (!response.ok) {
				setError(data.error || "Could not merge");
				return;
			}
			onMerged(loserId);
			reset();
			onOpenChange(false);
		} catch {
			setError("Could not merge");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<GitMerge className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Merge duplicate
							</DialogTitle>
						</div>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Preview first. The other record is retired, not deleted.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<SearchField
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Find the duplicate to retire..."
					/>
					<div className="space-y-2">
						{matches.map((row) => (
							<button
								key={row.$id}
								type="button"
								onClick={() => void loadPreview(row.$id)}
								className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
									loserId === row.$id
										? "border-blue-300 bg-blue-50"
										: "border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300"
								}`}
							>
								<p className="text-sm font-medium text-slate-700">
									{constituentDisplayName(row)}
								</p>
								<p className="text-xs text-slate-500">{row.email || "No email"}</p>
							</button>
						))}
					</div>
					{preview ? (
						<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
							<p className="text-sm font-medium sidebar-gradient-text">
								Preview
							</p>
							<p className="text-xs text-slate-600">
								Notes moving: {preview.noteCountLoser}. Relationships moving:{" "}
								{preview.relationshipCountLoser}. Gifts on loser:{" "}
								{preview.giftCountLoser}.
							</p>
							<ul className="text-xs text-slate-600 space-y-1">
								{preview.fieldDiffs.map((diff) => (
									<li key={diff.field}>
										{diff.field}: {String(diff.winner ?? "—")} ←{" "}
										{String(diff.loser ?? "—")}
									</li>
								))}
							</ul>
						</div>
					) : null}
					{error ? <p className="text-sm text-red">{error}</p> : null}
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving || !preview}
						onClick={() => void commit()}
					>
						<GitMerge className="h-4 w-4" />
						Merge
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
