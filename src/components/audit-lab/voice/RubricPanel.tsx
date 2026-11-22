import { Check, Circle } from "lucide-react";
import type { CoverageSnapshot } from "@/lib/audit-lab/voice/coverage";
import { cn } from "@/lib/utils";

/** Progress bar + checklist of rubric items covered so far (spec's `RubricPanel`). */
export function RubricPanel({
	coverage,
}: {
	coverage: CoverageSnapshot | null;
}) {
	const coveredCount = coverage?.coveredIds.length ?? 0;
	const totalCount = coverage?.total ?? 0;

	if (totalCount === 0) {
		return (
			<p className="voice-call-footnote">
				Waiting for rubric coverage from the interviewer…
			</p>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-xs font-semibold text-[#7c8798]">
				<span>Rubric coverage</span>
				<span className="tabular-nums text-[#7c8798]">
					{coveredCount}/{totalCount}
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full bg-[#078fab] transition-[width] duration-300"
					style={{
						width: `${totalCount > 0 ? Math.min(100, Math.round((coveredCount / totalCount) * 100)) : 0}%`,
					}}
				/>
			</div>
			<ul className="max-h-40 space-y-1.5 overflow-y-auto review-hover-scroll">
				{(coverage?.items ?? []).map((item) => (
					<li
						key={item.questionId}
						className={cn(
							"flex items-start gap-2 rounded-md px-2 py-1.5 text-[12.5px]",
							item.status === "current" &&
								"bg-[#078fab]/10 ring-1 ring-inset ring-[#078fab]/40",
						)}
					>
						{item.status === "covered" ? (
							<Check
								className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]"
								aria-hidden
							/>
						) : (
							<Circle
								className={cn(
									"mt-0.5 h-3.5 w-3.5 shrink-0",
									item.status === "current"
										? "text-[#078fab]"
										: "text-white/25",
								)}
								aria-hidden
							/>
						)}
						<span
							className={cn(
								item.status === "current" && "font-medium text-[#e2e8f0]",
								item.status === "remaining" && "text-[#aab2c0]",
								item.status === "covered" && "text-[#5d6675] line-through",
							)}
						>
							{item.prompt}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
