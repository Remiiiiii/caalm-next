"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ReviewQuestion } from "@/lib/audit-lab/types";
import {
	type ScriptCanvas,
	type ScriptSection,
	SCRIPT_SECTIONS,
	emptyCanvas,
	parseScriptItems,
	sectionMinutes,
	serializeScriptItems,
} from "@/lib/audit-lab/script-sections";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { cn } from "@/lib/utils";

const LABELS: Record<ScriptSection, string> = {
	opening: "Opening",
	process: "Process walkthroughs",
	evidence: "Evidence requests",
	closing: "Closing",
};

export function InterviewScriptCanvas({
	sessionId,
	questions,
	initialItemsJson,
	initialVersion,
	canEdit,
}: {
	sessionId: string;
	questions: ReviewQuestion[];
	initialItemsJson?: string;
	initialVersion: number;
	canEdit: boolean;
}) {
	const { toast } = useToast();
	const [canvas, setCanvas] = useState<ScriptCanvas>(() =>
		parseScriptItems(initialItemsJson),
	);
	const [version, setVersion] = useState(initialVersion);
	const [busy, setBusy] = useState(false);
	const [conflict, setConflict] = useState(false);
	const [editors, setEditors] = useState<
		Array<{ userId: string; name?: string; at: string }>
	>([]);

	useEffect(() => {
		if (!canEdit) return;
		const tick = () => {
			void fetch(`/api/audit-lab/scripts/${sessionId}/presence`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			})
				.then((r) => r.json())
				.then((json) => {
					if (Array.isArray(json?.data?.editors)) {
						setEditors(json.data.editors);
					}
				})
				.catch(() => undefined);
		};
		tick();
		const id = setInterval(tick, 15_000);
		return () => clearInterval(id);
	}, [sessionId, canEdit]);

	function onDropQuestion(section: ScriptSection, questionId: string) {
		const q = questions.find((row) => row.$id === questionId);
		if (!q) return;
		setCanvas((prev) => {
			const next = structuredClone(prev);
			next[section].push({
				id: `${section}-${q.$id}-${Date.now()}`,
				questionId: q.$id,
				prompt: q.prompt,
				minutes: 5,
				section,
			});
			return next;
		});
	}

	async function save() {
		setBusy(true);
		setConflict(false);
		try {
			const res = await fetch(`/api/audit-lab/scripts/${sessionId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					itemsJson: serializeScriptItems(canvas),
					expectedVersion: version,
				}),
			});
			const json = (await res.json()) as {
				error?: string;
				conflict?: boolean;
				currentVersion?: number;
				data?: { version: number; itemsJson: string };
			};
			if (res.status === 409) {
				setConflict(true);
				if (json.currentVersion) setVersion(json.currentVersion);
				toast({
					title: "Script conflict",
					description:
						"Someone else saved first. Refresh their version or keep editing and save again.",
					variant: "destructive",
				});
				return;
			}
			if (!res.ok) throw new Error(json.error || "Save failed");
			if (json.data) {
				setVersion(json.data.version);
				setCanvas(parseScriptItems(json.data.itemsJson));
			}
			toast({ title: "Script saved", description: `Version ${json.data?.version}` });
		} catch (err) {
			toast({
				title: "Script",
				description: toUserFacingErrorMessage(err, "Could not save script."),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
			<div className="space-y-2">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
					Question bank
				</p>
				{questions.length === 0 ? (
					<p className="text-sm text-slate-500">Generate questions first.</p>
				) : (
					<ul className="space-y-2">
						{questions.map((q) => (
							<li
								key={q.$id}
								draggable={canEdit}
								onDragStart={(e) => {
									e.dataTransfer.setData("text/question-id", q.$id);
								}}
								className="cursor-grab rounded-lg border border-slate-200 bg-white/70 px-2 py-2 text-xs text-slate-700"
							>
								{q.prompt}
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="space-y-3">
				{editors.length > 0 ? (
					<p className="text-xs text-slate-500">
						Editing now:{" "}
						{editors
							.map((e) => e.name || e.userId.slice(0, 6))
							.join(", ")}
					</p>
				) : null}
				{conflict ? (
					<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						Version conflict — reload the latest script, then merge your changes.
						<button
							type="button"
							className="ml-2 underline"
							onClick={() => {
								setCanvas(emptyCanvas());
								setConflict(false);
							}}
						>
							Clear canvas
						</button>
					</p>
				) : null}
				{SCRIPT_SECTIONS.map((section) => (
					<div
						key={section}
						className={cn(
							"min-h-[88px] rounded-lg border border-dashed border-slate-300 bg-white/40 p-3",
						)}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							e.preventDefault();
							const id = e.dataTransfer.getData("text/question-id");
							if (id) onDropQuestion(section, id);
						}}
					>
						<div className="mb-2 flex items-center justify-between text-xs text-slate-500">
							<span className="font-semibold text-slate-700">
								{LABELS[section]}
							</span>
							<span>{sectionMinutes(canvas[section])} min</span>
						</div>
						<ul className="space-y-1">
							{canvas[section].map((item) => (
								<li
									key={item.id}
									className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
								>
									{item.prompt}
								</li>
							))}
						</ul>
					</div>
				))}
				{canEdit ? (
					<Button
						type="button"
						className="btn-primary"
						disabled={busy}
						onClick={() => void save()}
					>
						Save script (v{version})
					</Button>
				) : null}
			</div>
		</div>
	);
}