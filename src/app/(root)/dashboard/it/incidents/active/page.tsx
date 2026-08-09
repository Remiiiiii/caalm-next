"use client";

import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";
import { AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export default function Page() {
	return (
		<ITPageShell
			title="Active Incidents"
			subtitle="Currently open operational incidents."
			icon={AlertCircle}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<ITGlassPanel>
					<p className="text-lg font-medium text-slate-900">Coming online</p>
					<p className="mt-2 text-sm text-slate-600">
						PagerDuty / Opsgenie incident feed is not wired yet. Navigation stays
						available so on-call paths never 404.
					</p>
					<ul className="mt-3 text-sm text-slate-600 space-y-1 list-disc pl-5">
						<li>
							Required integration:{" "}
							<span className="font-medium text-slate-800">
								PagerDuty / Opsgenie
							</span>
						</li>
						<li>
							Permission:{" "}
							<span className="font-mono text-xs text-slate-800">
								it.view_incidents
							</span>
						</li>
					</ul>
				</ITGlassPanel>
				<ITGlassPanel>
					<div className="flex items-start gap-3">
						<BookOpen className="h-8 w-8 text-[#0f5384]" />
						<div>
							<p className="text-lg font-medium text-slate-900">
								Start with a runbook
							</p>
							<p className="mt-1 text-sm text-slate-600">
								While the live incident feed is pending, use published runbooks
								for known failure modes.
							</p>
							<Button asChild className="primary-btn px-3 sm:px-4 mt-3">
								<Link href="/dashboard/it/incidents/runbooks">
									Browse runbooks
								</Link>
							</Button>
						</div>
					</div>
				</ITGlassPanel>
			</div>
		</ITPageShell>
	);
}
