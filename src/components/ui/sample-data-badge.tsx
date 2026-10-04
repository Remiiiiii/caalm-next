import { cn } from "@/lib/utils";

type SampleDataBadgeProps = {
	className?: string;
	/** Use DEMO when mock/demo mode is explicitly on; Sample for illustrative charts. */
	tone?: "sample" | "demo";
	label?: string;
};

/**
 * Small honesty label for charts that are not fed by live org queries.
 */
export function SampleDataBadge({
	className,
	tone = "sample",
	label,
}: SampleDataBadgeProps) {
	const text =
		label ?? (tone === "demo" ? "DEMO" : "Sample data");
	return (
		<span
			className={cn(
				"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
				tone === "demo"
					? "bg-orange/10 text-orange border-orange/20"
					: "bg-slate-100 text-slate-600 border-slate-200",
				className,
			)}
		>
			{text}
		</span>
	);
}
