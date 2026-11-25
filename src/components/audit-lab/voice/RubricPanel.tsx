import { Check, Circle, Paperclip } from "lucide-react";
import { useRef } from "react";
import type { CoverageSnapshot } from "@/lib/audit-lab/voice/coverage";
import { cn } from "@/lib/utils";

function RubricAttachButton({
	questionId,
	prompt,
	onAttach,
}: {
	questionId: string;
	prompt: string;
	onAttach: (file: File, questionId: string, prompt: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	return (
		<>
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (file) onAttach(file, questionId, prompt);
				}}
			/>
			<button
				type="button"
				title="Attach evidence to this question"
				className="shrink-0 rounded-full p-1 text-[#7c8798] hover:bg-white/10 hover:text-[#6fe0f5]"
				onClick={(e) => {
					e.stopPropagation();
					inputRef.current?.click();
				}}
			>
				<Paperclip className="h-3.5 w-3.5" aria-hidden />
			</button>
		</>
	);
}

/** Progress bar + checklist of rubric items covered so far (spec's `RubricPanel`) — each row can also attach evidence tagged to that specific item, independent of which item is currently active. */
export function RubricPanel({
	coverage,
	onAttach,
}: {
	coverage: CoverageSnapshot | null;
	onAttach?: (file: File, questionId: string, prompt: string) => void;
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
		<div className="flex min-h-0 flex-1 flex-col space-y-2">
			<div className="flex shrink-0 items-center justify-between text-xs font-semibold text-[#7c8798]">
				<span>Rubric coverage</span>
				<span className="tabular-nums text-[#7c8798]">
					{coveredCount}/{totalCount}
				</span>
			</div>
			<div className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full bg-[#078fab] transition-[width] duration-300"
					style={{
						width: `${totalCount > 0 ? Math.min(100, Math.round((coveredCount / totalCount) * 100)) : 0}%`,
					}}
				/>
			</div>
			<ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto review-hover-scroll">
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
								"flex-1",
								item.status === "current" && "font-medium text-[#e2e8f0]",
								item.status === "remaining" && "text-[#aab2c0]",
								item.status === "covered" && "text-[#5d6675] line-through",
							)}
						>
							{item.prompt}
						</span>
						{onAttach &&
						item.requiresEvidence &&
						item.status !== "remaining" ? (
							<RubricAttachButton
								questionId={item.questionId}
								prompt={item.prompt}
								onAttach={onAttach}
							/>
						) : null}
					</li>
				))}
			</ul>
		</div>
	);
}
