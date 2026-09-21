"use client";

import { ListChecks, Shield, Target } from "lucide-react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

export type FundingView = "retention" | "pursuits" | "queue";

/** Segmented Retention / Pursuits / Queue switch — white thumb on slate track. */
export function FundingViewSwitch({
	value,
	onChange,
	className,
}: {
	value: FundingView;
	onChange: (value: FundingView) => void;
	className?: string;
}) {
	return (
		<SegmentedToggle
			value={value}
			onChange={onChange}
			ariaLabel="Funding views"
			className={className}
			tabs={[
				{ value: "retention", label: "Retention", icon: Shield },
				{ value: "pursuits", label: "Pursuits", icon: Target },
				{ value: "queue", label: "Obligation queue", icon: ListChecks },
			]}
		/>
	);
}
