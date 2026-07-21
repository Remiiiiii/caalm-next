"use client";

import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export default function ContractsSavedViews() {
	const { savedViews, saveCurrentView, applySavedView, deleteSavedView } =
		useContractsView();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="px-3 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200"
				>
					<Bookmark className="h-4 w-4" />
					<span className="hidden sm:inline">Views</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-72 p-0 border border-slate-200 shadow-xl"
			>
				<div className="absolute top-0 left-0 right-0 h-3 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-slate-200 mt-3">
					<p className="text-sm font-semibold sidebar-gradient-text">
						Saved views
					</p>
					<p className="text-xs text-slate-600 mt-0.5">
						Save tabs, filters, and layout
					</p>
				</div>
				<div className="p-3 bg-slate-50 space-y-2 max-h-56 overflow-y-auto">
					{savedViews.length === 0 ? (
						<p className="text-xs text-slate-500 py-2 text-center">
							No saved views yet
						</p>
					) : (
						savedViews.map((view) => (
							<div
								key={view.id}
								className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
							>
								<button
									type="button"
									className="flex-1 text-left text-sm text-slate-800 hover:text-[#0f5384] truncate cursor-pointer"
									onClick={() => {
										applySavedView(view);
										setOpen(false);
									}}
								>
									{view.name}
								</button>
								<button
									type="button"
									className="p-1 rounded hover:bg-slate-100 cursor-pointer"
									aria-label={`Delete ${view.name}`}
									onClick={() => deleteSavedView(view.id)}
								>
									<Trash2 className="h-3.5 w-3.5 text-slate-500" />
								</button>
							</div>
						))
					)}
				</div>
				<div className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="View name"
						className="h-8 bg-white text-sm"
						onKeyDown={(e) => {
							if (e.key === "Enter" && name.trim()) {
								saveCurrentView(name);
								setName("");
							}
						}}
					/>
					<Button
						type="button"
						size="sm"
						className="primary-btn px-3 shrink-0 cursor-pointer"
						disabled={!name.trim()}
						onClick={() => {
							saveCurrentView(name);
							setName("");
						}}
					>
						<BookmarkPlus className="h-4 w-4" />
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
