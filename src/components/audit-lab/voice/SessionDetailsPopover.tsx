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
					className="voice-call-control-btn"
					aria-label="Session details"
				>
					<Info className="h-4 w-4" aria-hidden />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="voice-call-popover w-72 space-y-2 border-none p-4 text-sm backdrop-blur-none"
			>
				<p className="voice-call-panel-title">Session details</p>
				<dl className="space-y-1.5">
					<div className="flex justify-between gap-3">
						<dt className="text-[#7c8798]">Title</dt>
						<dd className="text-right font-medium text-[#e2e8f0]">{title}</dd>
					</div>
					{department ? (
						<div className="flex justify-between gap-3">
							<dt className="text-[#7c8798]">Department</dt>
							<dd className="text-right font-medium text-[#e2e8f0]">
								{department}
							</dd>
						</div>
					) : null}
					{framework ? (
						<div className="flex justify-between gap-3">
							<dt className="text-[#7c8798]">Framework</dt>
							<dd className="text-right font-medium text-[#e2e8f0]">
								{framework}
							</dd>
						</div>
					) : null}
					<div className="flex justify-between gap-3">
						<dt className="text-[#7c8798]">Interviewer</dt>
						<dd className="text-right font-medium text-[#e2e8f0]">
							{personaLabel}
						</dd>
					</div>
				</dl>
			</PopoverContent>
		</Popover>
	);
}
