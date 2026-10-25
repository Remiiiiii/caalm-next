"use client";

import { GitMerge } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<GitMerge className="h-5 w-5" />}
			title="Merge duplicate"
			description="Preview first. The other record is retired, not deleted."
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						disabled={saving}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						className="btn-primary px-3 sm:px-4"
						disabled={saving || !preview}
						onClick={() => void commit()}
					>
						<GitMerge className="h-4 w-4" />
						Merge
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
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
								<p className="text-xs text-slate-500">
									{row.email || "No email"}
								</p>
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
		</AppDialog>
	);
}
