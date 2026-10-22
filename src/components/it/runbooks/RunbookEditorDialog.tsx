"use client";

import { BookOpen, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
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
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] max-w-[720px]"
			pending={saving}
			icon={<BookOpen className="h-5 w-5" aria-hidden />}
			title={initial ? "Edit runbook" : "New runbook"}
			description="Write steps an unfamiliar on-call engineer can follow."
			footer={
				<div className="flex w-full items-center justify-between gap-3">
					<div className="text-xs text-slate-500">
						Publish only after a second person can follow it.
					</div>
					<div className="flex items-center gap-2.5">
						<Button
							type="button"
							variant="outline"
							className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							disabled={saving}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							disabled={saving}
							onClick={() => void handleSave()}
						>
							<Save className="h-4 w-4" />
							{saving ? "Saving…" : "Save runbook"}
						</Button>
					</div>
				</div>
			}
		>
			<div className="space-y-4 pb-1">
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
		</AppDialog>
	);
}
