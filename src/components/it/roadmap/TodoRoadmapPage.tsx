"use client";

import { LayersPlus } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const OVERVIEW_PATH = "/api/roadmap/overview?catalog=todo";

export function TodoRoadmapPage() {
	const { mutate } = useSWRConfig();
	const { toast } = useToast();
	const [prompt, setPrompt] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleGenerate() {
		const trimmed = prompt.trim();
		if (!trimmed || submitting) return;
		setSubmitting(true);
		try {
			const response = await fetch("/api/roadmap/todo/generate-section", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: trimmed }),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.error ?? "Failed to generate section");
			}
			toast({
				title: "Section added",
				description: `${data.prTitle} — opened PR #${data.prNumber}.`,
				icon: <LayersPlus className="h-4 w-4" />,
			});
			setPrompt("");
			await mutate(OVERVIEW_PATH);
		} catch (error) {
			toast({
				title: "Couldn't generate that section",
				description:
					error instanceof Error ? error.message : "Try rephrasing the prompt.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-slate-200 bg-white/70 p-4">
				<p className="mb-2 text-sm font-medium text-slate-700">
					Add a section from a prompt
				</p>
				<Textarea
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					placeholder="Describe the next backlog item — Claude turns it into a section with a task, acceptance criteria, and a PR stub."
					rows={3}
					disabled={submitting}
				/>
				<div className="mt-2 flex justify-end">
					<Button
						type="button"
						onClick={handleGenerate}
						disabled={submitting || !prompt.trim()}
					>
						{submitting ? "Generating…" : "Generate section"}
					</Button>
				</div>
			</div>
			<ClmRoadmapPage
				title="Todo Roadmap"
				subtitle="Developer backlog (todo.txt), ordered by effort. Each section is one PR. Run pricing-workshop-guide in /founder is tracked separately — it's a one-off action, not a PR."
				progressLabel="Overall backlog burn-down"
				overviewPath={OVERVIEW_PATH}
			/>
		</div>
	);
}
