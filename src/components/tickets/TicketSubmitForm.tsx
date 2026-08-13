"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TicketSeverity } from "@/lib/tickets/ticket.types";

export function TicketSubmitForm() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [severity, setSeverity] = useState<TicketSeverity>("medium");
	const [files, setFiles] = useState<FileList | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = title.trim().length >= 3 && description.trim().length >= 8;

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (!canSubmit) return;
		setSubmitting(true);
		setError(null);
		try {
			const form = new FormData();
			form.set("title", title.trim());
			form.set("description", description.trim());
			form.set("severity", severity);
			if (files) {
				Array.from(files)
					.slice(0, 5)
					.forEach((file) => form.append("attachments", file));
			}
			const res = await fetch("/api/tickets", { method: "POST", body: form });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to submit ticket");
			router.push(`/tickets/${data.ticket.$id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit ticket");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<form onSubmit={onSubmit} className="space-y-4">
					<div>
						<Label htmlFor="ticket-title">Title</Label>
						<Input
							id="ticket-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Summary of the problem"
							className="mt-1"
						/>
					</div>
					<div>
						<Label htmlFor="ticket-severity">Severity</Label>
						<select
							id="ticket-severity"
							value={severity}
							onChange={(event) =>
								setSeverity(event.target.value as TicketSeverity)
							}
							className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="critical">Critical</option>
						</select>
					</div>
					<div>
						<Label htmlFor="ticket-description">Description</Label>
						<Textarea
							id="ticket-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Describe the issue. Department and your identity are filled from your account."
							className="mt-1 min-h-32"
						/>
					</div>
					<div>
						<Label htmlFor="ticket-files">Attachments</Label>
						<Input
							id="ticket-files"
							type="file"
							multiple
							onChange={(event) => setFiles(event.target.files)}
							className="mt-1 cursor-pointer"
						/>
					</div>
					{error ? <p className="text-sm text-red">{error}</p> : null}
					<Button
						type="submit"
						className="primary-btn px-3 sm:px-4"
						disabled={!canSubmit || submitting}
					>
						{submitting ? "Submitting…" : "Submit ticket"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
