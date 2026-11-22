import { Info } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function SessionDetailsPopover({
	title,
	department,
	framework,
	personaLabel,
}: {
	title: string;
	department?: string;
	framework?: string;
	personaLabel: string;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white/80 text-slate-600 hover:bg-white"
					aria-label="Session details"
				>
					<Info className="h-4 w-4" aria-hidden />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 space-y-2 text-sm">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Session details
				</p>
				<dl className="space-y-1.5">
					<div className="flex justify-between gap-3">
						<dt className="text-slate-500">Title</dt>
						<dd className="text-right font-medium text-slate-800">{title}</dd>
					</div>
					{department ? (
						<div className="flex justify-between gap-3">
							<dt className="text-slate-500">Department</dt>
							<dd className="text-right font-medium text-slate-800">
								{department}
							</dd>
						</div>
					) : null}
					{framework ? (
						<div className="flex justify-between gap-3">
							<dt className="text-slate-500">Framework</dt>
							<dd className="text-right font-medium text-slate-800">
								{framework}
							</dd>
						</div>
					) : null}
					<div className="flex justify-between gap-3">
						<dt className="text-slate-500">Interviewer</dt>
						<dd className="text-right font-medium text-slate-800">
							{personaLabel}
						</dd>
					</div>
				</dl>
			</PopoverContent>
		</Popover>
	);
}
