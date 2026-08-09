"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Runbook, RunbookStep } from "@/lib/it/runbooks/types";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial: Runbook | null;
	onSaved: () => void;
};

const emptyStep = (): RunbookStep => ({ title: "", body: "", command: "" });

export function RunbookEditorDialog({
	open,
	onOpenChange,
	initial,
	onSaved,
}: Props) {
	const [title, setTitle] = useState("");
	const [summary, setSummary] = useState("");
	const [service, setService] = useState("appwrite");
	const [severity, setSeverity] = useState("medium");
	const [status, setStatus] = useState("draft");
	const [symptomsText, setSymptomsText] = useState("");
	const [verification, setVerification] = useState("");
	const [escalation, setEscalation] = useState("");
	const [steps, setSteps] = useState<RunbookStep[]>([emptyStep()]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		if (initial) {
			setTitle(initial.title);
			setSummary(initial.summary);
			setService(initial.service);
			setSeverity(initial.severity);
			setStatus(initial.status);
			setSymptomsText(initial.symptoms.join("\n"));
			setVerification(initial.verification);
			setEscalation(initial.escalation);
			setSteps(initial.steps.length ? initial.steps : [emptyStep()]);
		} else {
			setTitle("");
			setSummary("");
			setService("appwrite");
			setSeverity("medium");
			setStatus("draft");
			setSymptomsText("");
			setVerification("");
			setEscalation("");
			setSteps([emptyStep()]);
		}
		setError(null);
	}, [open, initial]);

	async function handleSave() {
		setSaving(true);
		setError(null);
		const payload = {
			title,
			summary,
			service,
			severity,
			status,
			symptoms: symptomsText
				.split("\n")
				.map((s) => s.trim())
				.filter(Boolean),
			steps: steps.filter((s) => s.title.trim() && s.body.trim()),
			verification,
			escalation,
			integrationKeys: [],
			tags: [service],
		};

		try {
			const res = await fetch(
				initial ? `/api/it/runbooks/${initial.$id}` : "/api/it/runbooks",
				{
					method: initial ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Save failed");
			}
			onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Save failed");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[720px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<BookOpen className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							{initial ? "Edit runbook" : "New runbook"}
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Write steps an unfamiliar on-call engineer can follow.
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="rb-title">Title</Label>
							<Input
								id="rb-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="bg-white"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="rb-summary">Summary</Label>
							<Input
								id="rb-summary"
								value={summary}
								onChange={(e) => setSummary(e.target.value)}
								className="bg-white"
							/>
						</div>
						<div className="space-y-2">
							<Label>Service</Label>
							<Select value={service} onValueChange={setService}>
								<SelectTrigger className="bg-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[
										"auth",
										"appwrite",
										"notifications",
										"payments",
										"deployments",
										"storage",
										"search",
									].map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Severity</Label>
							<Select value={severity} onValueChange={setSeverity}>
								<SelectTrigger className="bg-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["low", "medium", "high", "critical"].map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Status</Label>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger className="bg-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["draft", "published", "archived"].map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="rb-symptoms">Symptoms (one per line)</Label>
						<Textarea
							id="rb-symptoms"
							value={symptomsText}
							onChange={(e) => setSymptomsText(e.target.value)}
							className="min-h-24 bg-white"
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>Steps</Label>
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3"
								onClick={() => setSteps((prev) => [...prev, emptyStep()])}
							>
								<Plus className="h-4 w-4" />
								Add step
							</Button>
						</div>
						{steps.map((step, index) => (
							<div
								key={`step-${index}`}
								className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
							>
								<div className="flex items-center justify-between gap-2">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										Step {index + 1}
									</p>
									{steps.length > 1 ? (
										<button
											type="button"
											className="text-slate-400 hover:text-red"
											onClick={() =>
												setSteps((prev) => prev.filter((_, i) => i !== index))
											}
											aria-label={`Remove step ${index + 1}`}
										>
											<Trash2 className="h-4 w-4" />
										</button>
									) : null}
								</div>
								<Input
									placeholder="Step title"
									value={step.title}
									onChange={(e) =>
										setSteps((prev) =>
											prev.map((s, i) =>
												i === index ? { ...s, title: e.target.value } : s,
											),
										)
									}
								/>
								<Textarea
									placeholder="What to do"
									value={step.body}
									onChange={(e) =>
										setSteps((prev) =>
											prev.map((s, i) =>
												i === index ? { ...s, body: e.target.value } : s,
											),
										)
									}
									className="min-h-20"
								/>
								<Input
									placeholder="Optional command"
									value={step.command || ""}
									onChange={(e) =>
										setSteps((prev) =>
											prev.map((s, i) =>
												i === index ? { ...s, command: e.target.value } : s,
											),
										)
									}
								/>
							</div>
						))}
					</div>

					<div className="space-y-2">
						<Label htmlFor="rb-verify">Verification</Label>
						<Textarea
							id="rb-verify"
							value={verification}
							onChange={(e) => setVerification(e.target.value)}
							className="min-h-20 bg-white"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="rb-esc">Escalation</Label>
						<Textarea
							id="rb-esc"
							value={escalation}
							onChange={(e) => setEscalation(e.target.value)}
							className="min-h-20 bg-white"
						/>
					</div>

					{error ? <p className="text-sm text-red">{error}</p> : null}
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
					<div className="text-xs text-slate-500">
						Publish only after a second person can follow it.
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void handleSave()}
						>
							{saving ? "Saving…" : "Save runbook"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
