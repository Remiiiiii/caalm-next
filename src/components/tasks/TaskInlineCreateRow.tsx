"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function TaskInlineCreateRow({
	open,
	onOpen,
	onCancel,
	onSubmit,
	disabled,
}: {
	open: boolean;
	onOpen: () => void;
	onCancel: () => void;
	onSubmit: (title: string) => Promise<void>;
	disabled?: boolean;
}) {
	const [title, setTitle] = useState("");
	const [saving, setSaving] = useState(false);

	if (!open) {
		return (
			<div className="border-b border-slate-100 px-4 py-2.5">
				<button
					type="button"
					disabled={disabled}
					onClick={onOpen}
					className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border-[0.25px] border-slate-300 bg-transparent px-3 text-left disabled:cursor-not-allowed"
				>
					<Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
					<span className="flex-1 text-sm text-slate-500">
						Task title — Then press Enter to create
					</span>
				</button>
			</div>
		);
	}

	return (
		<div className="border-b border-slate-100 px-4 py-2.5">
			<label className="flex h-9 w-full items-center gap-2 rounded-md border-[0.25px] border-slate-300 bg-transparent px-3">
				<Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
				<input
					value={title}
					disabled={saving || disabled}
					placeholder="Task title — Then press Enter to create"
					aria-label="New task title"
					className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
					onChange={(e) => setTitle(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setTitle("");
							onCancel();
						}
						if (e.key !== "Enter" || !title.trim() || saving) return;
						e.preventDefault();
						setSaving(true);
						void onSubmit(title.trim())
							.then(() => setTitle(""))
							.finally(() => setSaving(false));
					}}
				/>
			</label>
		</div>
	);
}
