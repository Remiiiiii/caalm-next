"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type Constituent,
	constituentDisplayName,
	RELATIONSHIP_TYPES,
	type RelationshipType,
} from "@/lib/constituents";

export function AddRelationshipDialog({
	open,
	onOpenChange,
	constituentId,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	constituentId: string;
	onCreated: () => void;
}) {
	const [query, setQuery] = useState("");
	const [matches, setMatches] = useState<Constituent[]>([]);
	const [toId, setToId] = useState("");
	const [type, setType] = useState<RelationshipType>("household");
	const [softCredit, setSoftCredit] = useState(false);
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
					(row) => row.$id !== constituentId,
				),
			);
		}, 250);
		return () => window.clearTimeout(timer);
	}, [query, open, constituentId]);

	const reset = () => {
		setQuery("");
		setToId("");
		setType("household");
		setSoftCredit(false);
		setError(null);
		setSaving(false);
	};

	const submit = async () => {
		if (!toId) return;
		setSaving(true);
		setError(null);
		try {
			const response = await fetch(
				`/api/constituents/${constituentId}/relationships`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ toId, type, softCredit }),
				},
			);
			const data = await response.json();
			if (!response.ok) {
				setError(data.error || "Could not add relationship");
				return;
			}
			reset();
			onCreated();
			onOpenChange(false);
		} catch {
			setError("Could not add relationship");
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
							<Link2 className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Add relationship
							</DialogTitle>
						</div>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Link another person in this organization.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<SearchField
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search constituents..."
					/>
					<div className="space-y-2">
						{matches.map((row) => (
							<button
								key={row.$id}
								type="button"
								onClick={() => setToId(row.$id)}
								className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
									toId === row.$id
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
					<Select
						value={type}
						onValueChange={(value) => setType(value as RelationshipType)}
					>
						<SelectTrigger className="border-[0.25px] border-slate-300">
							<SelectValue placeholder="Relationship type" />
						</SelectTrigger>
						<SelectContent>
							{RELATIONSHIP_TYPES.map((value) => (
								<SelectItem key={value} value={value}>
									{value.charAt(0).toUpperCase() + value.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input
							type="checkbox"
							checked={softCredit}
							onChange={(event) => setSoftCredit(event.target.checked)}
						/>
						Soft credit
					</label>
					{error ? <p className="text-sm text-red">{error}</p> : null}
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving || !toId}
						onClick={() => void submit()}
					>
						<Link2 className="h-4 w-4" />
						Add
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
