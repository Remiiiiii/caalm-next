import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardIconTone = "default" | "warning" | "danger" | "success";

interface StatCardIconProps {
	icon?:
		| LucideIcon
		| ComponentType<{ className?: string; strokeWidth?: number }>;
	children?: ReactNode;
	className?: string;
	iconClassName?: string;
	tone?: StatCardIconTone;
}

const TONE_ICON: Record<StatCardIconTone, string> = {
	default: "text-[#0f5384]",
	warning: "text-orange",
	danger: "text-red",
	success: "text-green",
};

/** Frosted rounded-square tile — same chrome as the contract side-window header icon. */
export function StatCardIcon({
	icon: Icon,
	children,
	className,
	iconClassName,
	tone = "default",
}: StatCardIconProps) {
	return (
		<div
			className={cn(
				"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-sm backdrop-blur-sm",
				className,
			)}
		>
			{Icon ? (
				<Icon
					className={cn("h-4 w-4", TONE_ICON[tone], iconClassName)}
					strokeWidth={1.75}
				/>
			) : (
				children
			)}
		</div>
	);
}
