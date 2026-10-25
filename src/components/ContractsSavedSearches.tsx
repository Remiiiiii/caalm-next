"use client";

import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import type { UseSAMOpportunitiesFilters } from "@/hooks/useSAMOpportunities";
import {
	type AdvancedSearchFilters,
	deleteSavedSearch,
	getSavedSearches,
	saveSearch,
} from "@/lib/actions/search.actions";

const MAX_SAVED_SEARCHES = 20;

/** The `saved_searches` table also backs the global Advanced Search feature — tag rows so each only loads its own. */
const SCOPE = "contracts" as const;

type StoredFilters = UseSAMOpportunitiesFilters & { __scope?: typeof SCOPE };

interface SavedContractSearch {
	id: string;
	name: string;
	filters: UseSAMOpportunitiesFilters;
}

interface ContractsSavedSearchesProps {
	currentFilters: UseSAMOpportunitiesFilters;
	onApply: (filters: UseSAMOpportunitiesFilters) => void;
}

export default function ContractsSavedSearches({
	currentFilters,
	onApply,
}: ContractsSavedSearchesProps) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [savedSearches, setSavedSearches] = useState<SavedContractSearch[]>([]);

	useEffect(() => {
		if (!user?.$id) return;
		getSavedSearches(user.$id)
			.then((rows) => {
				setSavedSearches(
					rows
						.filter(
							(row) =>
								(row.filters as unknown as StoredFilters)?.__scope === SCOPE,
						)
						.map((row) => ({
							id: row.$id,
							name: row.name,
							filters: row.filters as unknown as UseSAMOpportunitiesFilters,
						})),
				);
			})
			.catch((err) => {
				console.error(
					"[CLIENT] ContractsSavedSearches: failed to load saved searches",
					err,
				);
			});
	}, [user?.$id]);

	const handleSave = useCallback(async () => {
		const trimmed = name.trim();
		if (!trimmed || saving || !user?.$id) return;
		if (
			savedSearches.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())
		) {
			setError("You already have a saved search with this name.");
			return;
		}

		setSaving(true);
		try {
			const stored: StoredFilters = { ...currentFilters, __scope: SCOPE };
			const saved = await saveSearch({
				userId: user.$id,
				name: trimmed,
				query: currentFilters.keyword || "",
				filters: stored as unknown as AdvancedSearchFilters,
			});
			setSavedSearches((prev) => [
				{ id: saved.$id, name: saved.name, filters: currentFilters },
				...prev,
			]);
			setName("");
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Couldn't save search. Try again.",
			);
		} finally {
			setSaving(false);
		}
	}, [name, saving, savedSearches, currentFilters, user?.$id]);

	const handleDelete = useCallback(
		async (saved: SavedContractSearch) => {
			if (!user?.$id) return;
			setSavedSearches((prev) => prev.filter((s) => s.id !== saved.id));
			try {
				await deleteSavedSearch(saved.id, user.$id);
			} catch (err) {
				console.error("[CLIENT] ContractsSavedSearches: delete failed", err);
				setSavedSearches((prev) => [saved, ...prev]);
			}
		},
		[user?.$id],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<TooltipProvider delayDuration={400}>
				<Tooltip open={open ? false : undefined}>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								className="btn-primary border-0 shadow-none focus-visible:ring-0 gap-1.5 px-2.5 py-1.5 h-8 text-xs"
							>
								<Bookmark className="h-3.5 w-3.5" aria-hidden />
								Save search
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent
						side="bottom"
						className="text-xs font-normal text-slate-700"
					>
						Save or reapply this search
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PopoverContent
				align="end"
				className="w-72 p-0 border border-slate-200 shadow-xl"
			>
				<div className="absolute top-0 left-0 right-0 h-3 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-slate-200 mt-3">
					<p className="text-sm font-semibold sidebar-gradient-text">
						Saved searches
					</p>
					<p className="text-xs text-slate-600 mt-0.5">
						Save and reapply this search's filters
					</p>
				</div>
				<div className="p-3 bg-slate-50 space-y-2 max-h-56 overflow-y-auto">
					{savedSearches.length === 0 ? (
						<p className="text-xs text-slate-500 py-2 text-center">
							No saved searches yet
						</p>
					) : (
						savedSearches.map((saved) => (
							<div
								key={saved.id}
								className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
							>
								<button
									type="button"
									className="flex-1 text-left text-sm text-slate-700 hover:text-[#0f5384] truncate cursor-pointer"
									onClick={() => {
										onApply(saved.filters);
										setOpen(false);
									}}
								>
									{saved.name}
								</button>
								<button
									type="button"
									className="p-1 rounded hover:bg-slate-100 cursor-pointer"
									aria-label={`Delete ${saved.name}`}
									onClick={() => handleDelete(saved)}
								>
									<Trash2 className="h-3.5 w-3.5 text-slate-500" />
								</button>
							</div>
						))
					)}
				</div>
				<div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
					<div className="flex gap-2">
						<Input
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError(null);
							}}
							placeholder="Search name"
							className="h-8 bg-white text-sm"
							disabled={savedSearches.length >= MAX_SAVED_SEARCHES}
							onKeyDown={(e) => {
								if (e.key === "Enter" && name.trim()) handleSave();
							}}
						/>
						<Button
							type="button"
							size="sm"
							className="primary-btn px-3 shrink-0 cursor-pointer"
							disabled={
								!name.trim() ||
								saving ||
								savedSearches.length >= MAX_SAVED_SEARCHES
							}
							onClick={handleSave}
						>
							<BookmarkPlus className="h-4 w-4" />
						</Button>
					</div>
					{error && <p className="text-xs text-destructive">{error}</p>}
					{savedSearches.length >= MAX_SAVED_SEARCHES && (
						<p className="text-xs text-slate-500">
							Limit reached — delete a saved search to add another.
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
