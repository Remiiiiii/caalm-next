"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	formatReadinessPercent,
	isReadinessDomainScored,
} from "./readiness-ui";
import type { RagThresholds, ReadinessDomain } from "./types";

/** Plain-language explanation of how the readiness score is built. */
export function ReadinessExplainSheet({
	open,
	onOpenChange,
	score,
	thresholds,
	domains,
	sourcesUsed,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	score: number | null;
	thresholds: RagThresholds;
	domains: ReadinessDomain[];
	sourcesUsed: string[];
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>How the readiness score works</SheetTitle>
					<SheetDescription>
						A live health check, not an official audit determination.
					</SheetDescription>
				</SheetHeader>
				<div className="body-2 mt-4 space-y-4">
					<section>
						<p className="font-semibold">Formula</p>
						<p>
							The score is the average of the domain scores that have live data,
							rounded to a whole number. A domain with no data is left out, not
							counted as zero.
						</p>
						<p className="mt-1">
							Your score today:{" "}
							<b>
								{score === null ? "not available" : formatReadinessPercent(score)}
							</b>
							{sourcesUsed.length ? ` (from ${sourcesUsed.join(" and ")})` : ""}
							.
						</p>
					</section>
					<section>
						<p className="font-semibold">Domains</p>
						<ul className="mt-1 space-y-1">
							{domains.map((domain) => (
								<li key={domain.label} className="flex justify-between gap-3">
									<span>{domain.label}</span>
									<b className="tabular-nums">
										{isReadinessDomainScored(domain, sourcesUsed)
											? formatReadinessPercent(domain.readinessPercent)
											: "Not scored"}
									</b>
								</li>
							))}
						</ul>
						<p className="caption mt-1 text-slate-500">
							Contracts use the contract compliance rate. Licenses use the share
							of licenses marked compliant. Both count equally.
						</p>
					</section>
					<section>
						<p className="font-semibold">Status bands</p>
						<ul className="mt-1 space-y-1">
							<li>Red: below {formatReadinessPercent(thresholds.amber)}</li>
							<li>
								Amber: {formatReadinessPercent(thresholds.amber)} to{" "}
								{formatReadinessPercent(thresholds.green - 1)}
							</li>
							<li>
								Green: {formatReadinessPercent(thresholds.green)} and above
							</li>
						</ul>
					</section>
					<section>
						<p className="font-semibold">Data sources</p>
						<p>
							{sourcesUsed.length
								? sourcesUsed.join(", ")
								: "No live sources yet. Add contracts or licenses to start."}
							. The public-site check is informational and never changes the
							score.
						</p>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
