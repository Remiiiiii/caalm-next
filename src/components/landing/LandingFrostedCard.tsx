import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LandingFrostedCardProps {
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	showCap?: boolean;
}

export default function LandingFrostedCard({
	children,
	className,
	contentClassName,
	showCap = true,
}: LandingFrostedCardProps) {
	return (
		<div className={cn("landing-frosted-card", className)}>
			{showCap ? <div className="glass-card-cap" /> : null}
			<div className={cn("relative z-[1] h-full rounded-[inherit]", contentClassName)}>
				{children}
			</div>
		</div>
	);
}
