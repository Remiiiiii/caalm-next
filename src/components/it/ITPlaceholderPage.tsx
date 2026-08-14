"use client";

import { Construction, type LucideIcon } from "lucide-react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";

interface ITPlaceholderPageProps {
	title: string;
	subtitle?: string;
	purpose: string;
	requiredIntegration?: string;
	permission?: string;
	icon?: LucideIcon;
}

export function ITPlaceholderPage({
	title,
	subtitle,
	purpose,
	requiredIntegration = "Telemetry / observability backend",
	permission,
	icon: Icon = Construction,
}: ITPlaceholderPageProps) {
	return (
		<ITPageShell title={title} subtitle={subtitle} icon={Icon}>
			<ITGlassPanel>
				<div className="flex flex-col items-start gap-3 max-w-xl">
					<Icon className="h-10 w-10 text-slate-400" />
					<p className="text-lg font-medium text-slate-700">Coming online</p>
					<p className="text-sm text-slate-600">{purpose}</p>
					<ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
						<li>
							Required integration:{" "}
							<span className="font-medium text-slate-800">
								{requiredIntegration}
							</span>
						</li>
						{permission ? (
							<li>
								Permission:{" "}
								<span className="text-xs text-slate-800">
									{permission}
								</span>
							</li>
						) : null}
					</ul>
					<p className="text-xs text-slate-500 mt-2">
						Request backend hookup when the data source is ready. This route is
						registered so navigation never 404s.
					</p>
				</div>
			</ITGlassPanel>
		</ITPageShell>
	);
}
