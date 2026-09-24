"use client";

import { StickyNote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { NOTE_KINDS, type ConstituentNoteKind } from "@/lib/constituents";

export function AddNoteDialog({
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
	const [kind, setKind] = useState<ConstituentNoteKind>("note");
	const [body, setBody] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reset = () => {
		setKind("note");
		setBody("");
		setError(null);
		setSaving(false);
	};

	const submit = async () => {
		if (!body.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const response = await fetch(`/api/constituents/${constituentId}/notes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ kind, body: body.trim() }),
			});
			const data = await response.json();
			if (!response.ok) {
				setError(data.error || "Could not add note");
				return;
			}
			reset();
			onCreated();
			onOpenChange(false);
		} catch {
			setError("Could not add note");
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
							<StickyNote className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Add timeline note
							</DialogTitle>
						</div>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<Select
						value={kind}
						onValueChange={(value) => setKind(value as ConstituentNoteKind)}
					>
						<SelectTrigger className="border-[0.25px] border-slate-300">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{NOTE_KINDS.map((value) => (
								<SelectItem key={value} value={value}>
									{value.charAt(0).toUpperCase() + value.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<textarea
						value={body}
						onChange={(event) => setBody(event.target.value)}
						rows={5}
						placeholder="What happened?"
						className="w-full rounded-md border-[0.25px] border-slate-300 bg-white p-3 text-sm text-slate-700"
					/>
					{error ? <p className="text-sm text-red">{error}</p> : null}
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving || !body.trim()}
						onClick={() => void submit()}
					>
						<StickyNote className="h-4 w-4" />
						Add
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
