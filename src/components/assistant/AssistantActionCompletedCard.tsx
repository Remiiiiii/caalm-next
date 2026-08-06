"use client";

import { Check } from "lucide-react";
import type { AssistantActionCompleted } from "@/components/assistant/assistantTypes";

export default function AssistantActionCompletedCard({
	action,
}: {
	action: AssistantActionCompleted;
}) {
	return (
		<div className="glass-card mt-2 w-full overflow-hidden text-left">
			<div className="glass-card-cap" />
			<div className="relative z-1">
				<div className="flex items-start gap-2.5 border-b border-slate-200/80 px-4 pb-3.5 pt-6">
					<div className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-green/10">
						<Check
							className="h-3 w-3 text-green"
							strokeWidth={3}
							aria-hidden
						/>
					</div>
					<div className="min-w-0 flex flex-col gap-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-[#0f5384]">
							{action.eyebrow ?? "Action completed"}
						</span>
						<p className="text-sm font-semibold leading-snug text-slate-700">
							{action.headline}
						</p>
					</div>
				</div>

				<div className="px-4 py-1">
					{action.fields.map((field, index) => (
						<div
							key={`${field.label}-${index}`}
							className="flex items-baseline justify-between gap-3.5 border-b border-slate-100 py-2.5 last:border-b-0"
						>
							<span className="shrink-0 text-xs text-slate-500">
								{field.label}
							</span>
							<span className="min-w-0 text-right text-xs font-semibold text-slate-700">
								{field.value}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
