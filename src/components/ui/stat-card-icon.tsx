import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardIconProps {
	icon?: LucideIcon;
	children?: ReactNode;
	className?: string;
	iconClassName?: string;
}

/** Soft mint rounded-square badge used for stat card icons. */
export function StatCardIcon({
	icon: Icon,
	children,
	className,
	iconClassName,
}: StatCardIconProps) {
	return (
		<span
			className={cn(
				"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green/15",
				className,
			)}
		>
			{Icon ? (
				<Icon
					className={cn("h-5 w-5", iconClassName, "text-[#0F6B66]")}
					strokeWidth={1.75}
				/>
			) : (
				children
			)}
		</span>
	);
}
