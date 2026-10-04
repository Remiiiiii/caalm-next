"use client";

import { Construction, type LucideIcon } from "lucide-react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";

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
		<ITPageShell
			title={title}
			subtitle={subtitle}
			icon={Icon}
			actions={<SampleDataBadge label="Preview" />}
		>
			<ITGlassPanel>
				<div className="flex flex-col items-start gap-3 max-w-xl">
					<Icon className="h-10 w-10 text-slate-400" />
					<div className="flex items-center gap-2">
						<p className="text-lg font-medium text-slate-700">Coming online</p>
						<SampleDataBadge label="Preview" />
					</div>
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
								<span className="text-xs text-slate-800">{permission}</span>
							</li>
						) : null}
					</ul>
					<p className="text-xs text-slate-500 mt-2">
						This route stays available for internal QA via deep link. It is hidden
						from the primary IT nav until a real data source is wired.
					</p>
				</div>
			</ITGlassPanel>
		</ITPageShell>
	);
}
