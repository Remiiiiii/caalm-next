"use client";

import { StickyNote } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type ConstituentNoteKind, NOTE_KINDS } from "@/lib/constituents";

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
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<StickyNote className="h-5 w-5" />}
			title="Add timeline note"
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
						disabled={saving || !body.trim()}
						onClick={() => void submit()}
					>
						<StickyNote className="h-4 w-4" />
						Add
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
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
		</AppDialog>
	);
}
