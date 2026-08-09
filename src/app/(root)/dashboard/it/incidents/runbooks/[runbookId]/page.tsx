"use client";

import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Runbook } from "@/lib/it/runbooks/types";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RunbookDetailPage() {
	const params = useParams<{ runbookId: string }>();
	const [item, setItem] = useState<Runbook | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const res = await fetch(`/api/it/runbooks/${params.runbookId}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Not found");
				if (!cancelled) setItem(data.item);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [params.runbookId]);

	return (
		<ITPageShell
			title={item?.title || "Runbook"}
			subtitle={item?.summary || "Operational recovery procedure"}
			icon={BookOpen}
			actions={
				<Button asChild variant="outline" className="primary-btn px-3 sm:px-4">
					<Link href="/dashboard/it/incidents/runbooks">
						<ArrowLeft className="h-4 w-4" />
						All runbooks
					</Link>
				</Button>
			}
		>
			{loading ? (
				<ITGlassPanel>
					<p className="text-sm text-slate-600">Loading runbook…</p>
				</ITGlassPanel>
			) : null}
			{error ? (
				<ITGlassPanel>
					<p className="text-sm text-red">{error}</p>
				</ITGlassPanel>
			) : null}
			{item ? (
				<div className="space-y-6">
					<ITGlassPanel>
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="bg-white">
								{item.service}
							</Badge>
							<Badge variant="outline" className="bg-white">
								{item.severity}
							</Badge>
							<Badge variant="outline" className="bg-white">
								{item.status}
							</Badge>
						</div>
						<div className="mt-4">
							<p className="text-sm font-medium sidebar-gradient-text">
								Symptoms
							</p>
							<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
								{item.symptoms.map((s) => (
									<li key={s}>{s}</li>
								))}
							</ul>
						</div>
					</ITGlassPanel>

					<div className="space-y-3">
						{item.steps.map((step, index) => (
							<ITGlassPanel key={`${step.title}-${index}`}>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Step {index + 1}
								</p>
								<p className="mt-1 text-base font-semibold text-slate-900">
									{step.title}
								</p>
								<p className="mt-2 text-sm leading-6 text-slate-700">
									{step.body}
								</p>
								{step.command ? (
									<pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
										<code>{step.command}</code>
									</pre>
								) : null}
							</ITGlassPanel>
						))}
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<ITGlassPanel>
							<p className="text-sm font-medium sidebar-gradient-text">
								Verification
							</p>
							<p className="mt-2 text-sm leading-6 text-slate-700">
								{item.verification}
							</p>
						</ITGlassPanel>
						<ITGlassPanel>
							<p className="text-sm font-medium sidebar-gradient-text">
								Escalation
							</p>
							<p className="mt-2 text-sm leading-6 text-slate-700">
								{item.escalation}
							</p>
						</ITGlassPanel>
					</div>
				</div>
			) : null}
		</ITPageShell>
	);
}
