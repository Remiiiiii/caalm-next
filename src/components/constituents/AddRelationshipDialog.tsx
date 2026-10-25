"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<Link2 className="h-5 w-5" />}
			title="Add relationship"
			description="Link another person in this organization."
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
						disabled={saving || !toId}
						onClick={() => void submit()}
					>
						<Link2 className="h-4 w-4" />
						Add
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
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
								<p className="text-xs text-slate-500">
									{row.email || "No email"}
								</p>
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
		</AppDialog>
	);
}
