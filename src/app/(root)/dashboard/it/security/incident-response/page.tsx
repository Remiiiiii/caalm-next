"use client";

import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";
import { BookOpen, Construction, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function Page() {
	return (
		<ITPageShell
			title="Incident Response"
			subtitle="Playbooks and active security incidents."
			icon={ShieldAlert}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<ITGlassPanel>
					<div className="flex flex-col items-start gap-3 max-w-xl">
						<Construction className="h-10 w-10 text-slate-400" />
						<p className="text-lg font-medium text-slate-900">Coming online</p>
						<p className="text-sm text-slate-600">
							Live incident-response platform wiring is still pending. Use
							Runbooks now for recovery procedures.
						</p>
						<ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
							<li>
								Required integration:{" "}
								<span className="font-medium text-slate-800">
									Incident response platform
								</span>
							</li>
							<li>
								Permission:{" "}
								<span className="font-mono text-xs text-slate-800">
									it.view_incidents
								</span>
							</li>
						</ul>
					</div>
				</ITGlassPanel>

				<ITGlassPanel>
					<div className="flex flex-col items-start gap-3">
						<BookOpen className="h-10 w-10 text-[#0f5384]" />
						<p className="text-lg font-medium text-slate-900">
							Operational runbooks are ready
						</p>
						<p className="text-sm text-slate-600">
							Open the IT Runbooks CMS to browse, create, and execute recovery
							steps while incident integrations come online.
						</p>
						<div className="flex flex-wrap gap-2">
							<Button asChild className="primary-btn px-3 sm:px-4">
								<Link href="/dashboard/it/incidents/runbooks">Open runbooks</Link>
							</Button>
							<Button asChild variant="outline" className="primary-btn px-3 sm:px-4">
								<Link href="/docs/runbooks/overview">Read docs</Link>
							</Button>
						</div>
					</div>
				</ITGlassPanel>
			</div>
		</ITPageShell>
	);
}
