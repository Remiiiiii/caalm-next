"use client";

import { Clock, FileText, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AddNoteDialog } from "@/components/constituents/AddNoteDialog";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConstituentNote, DerivedAgreement } from "@/lib/constituents";

export function TimelineTab({
	constituentId,
	canManage,
}: {
	constituentId: string;
	canManage: boolean;
}) {
	const [notes, setNotes] = useState<ConstituentNote[]>([]);
	const [agreements, setAgreements] = useState<DerivedAgreement[]>([]);
	const [loading, setLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<ConstituentNote | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch(
				`/api/constituents/${constituentId}/timeline`,
			);
			const data = await response.json();
			setNotes(data.notes || []);
			setAgreements(data.agreements || []);
		} finally {
			setLoading(false);
		}
	}, [constituentId]);

	useEffect(() => {
		void load();
	}, [load]);

	const remove = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		try {
			const response = await fetch(
				`/api/constituents/${constituentId}/notes/${pendingDelete.$id}`,
				{ method: "DELETE" },
			);
			if (!response.ok) return;
			setPendingDelete(null);
			await load();
		} finally {
			setDeleting(false);
		}
	};

	const empty = !loading && notes.length === 0 && agreements.length === 0;

	return (
		<div>
			{canManage ? (
				<div className="mb-4 flex items-center justify-end">
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => setAddOpen(true)}
					>
						<Plus className="h-4 w-4" />
						Add note
					</Button>
				</div>
			) : null}

			{loading ? (
				<p className="text-sm text-slate-600">Loading timeline…</p>
			) : empty ? (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Clock className="h-8 w-8 text-[#0f5384]" />
					<p className="mt-3 text-sm font-medium text-slate-700">
						No timeline yet
					</p>
					<p className="mt-1 max-w-md text-xs text-slate-600">
						Notes, meetings, and linked contracts will appear here.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{agreements.map((row) => (
						<Link
							key={row.$id}
							href={row.href}
							className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
						>
							<FileText className="mt-0.5 h-4 w-4 text-[#0f5384]" />
							<div>
								<p className="text-sm font-medium text-slate-700">{row.name}</p>
								<span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
									{row.kind === "grant" ? "Grant" : "Contract"}
								</span>
							</div>
						</Link>
					))}
					{notes.map((note) => (
						<div
							key={note.$id}
							className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4"
						>
							<div>
								<p className="text-sm text-slate-700 whitespace-pre-wrap">
									{note.body}
								</p>
								<p className="mt-2 text-xs text-slate-500">
									{note.kind === "meeting" ? "Meeting" : "Note"}
									{note.authorName ? ` · ${note.authorName}` : ""}
									{note.$createdAt
										? ` · ${new Date(note.$createdAt).toLocaleString()}`
										: ""}
								</p>
							</div>
							{canManage ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										className="shad-no-focus rounded-full transition-colors hover:bg-white/30"
										aria-label={`Actions for note`}
									>
										<Image
											src="/assets/icons/dots.svg"
											alt=""
											width={34}
											height={34}
										/>
									</DropdownMenuTrigger>
									<AppDropdownMenuContent align="end">
										<DropdownMenuSeparator />
										<AppDropdownMenuItem
											icon={Trash2}
											tone="danger"
											onClick={() => setPendingDelete(note)}
										>
											Delete
										</AppDropdownMenuItem>
									</AppDropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					))}
				</div>
			)}

			<AddNoteDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				constituentId={constituentId}
				onCreated={() => void load()}
			/>
			<DeleteConfirmationDialog
				open={Boolean(pendingDelete)}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
				title="Delete note"
				description="This removes the note from the timeline. The delete is audit-logged."
				itemName="timeline note"
				onConfirm={() => void remove()}
				isLoading={deleting}
			/>
		</div>
	);
}
