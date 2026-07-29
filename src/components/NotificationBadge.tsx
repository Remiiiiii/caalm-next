import type React from "react";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
	count: number;
	priority?: "low" | "medium" | "high" | "urgent";
	type?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

/** Matches landing FeatureSpotlightGrid bell badge (teal pill, white count). */
const NotificationBadge: React.FC<NotificationBadgeProps> = ({
	count,
	size = "md",
	className,
}) => {
	if (!count || count === 0) return null;

	const getSizeStyles = () => {
		switch (size) {
			case "sm":
				return "h-4 min-w-4 px-1 text-[9px]";
			case "lg":
				return "h-6 min-w-6 px-1.5 text-xs";
			default:
				return "h-5 min-w-5 px-1 text-[10px]";
		}
	};

	const displayCount = count > 99 ? "99+" : count.toString();

	return (
		<div
			className={cn(
				"inline-flex items-center justify-center rounded-full bg-[#00C1CB] font-bold text-white shadow-sm",
				getSizeStyles(),
				className,
			)}
			title={`${count} notification${count !== 1 ? "s" : ""}`}
		>
			{displayCount}
		</div>
	);
};

export default NotificationBadge;
