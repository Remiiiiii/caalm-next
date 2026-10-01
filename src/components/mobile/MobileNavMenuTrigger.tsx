"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileNavMenuTriggerProps = {
	open: boolean;
	className?: string;
};

/** 3×3 dot grid — matches marketing site mobile menu trigger. */
export function MobileNavMenuTriggerIcon({
	open,
	className,
}: MobileNavMenuTriggerProps) {
	if (open) {
		return <X className={cn("h-5 w-5 text-slate-700", className)} strokeWidth={2} />;
	}

	return (
		<span
			className={cn(
				"grid grid-cols-3 gap-[3px] text-slate-500 transition-colors duration-200 group-hover:text-slate-700",
				className,
			)}
			aria-hidden
		>
			{Array.from({ length: 9 }).map((_, i) => (
				<span key={i} className="size-1 rounded-full bg-current" />
			))}
		</span>
	);
}
