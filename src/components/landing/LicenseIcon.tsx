"use client";

import { Award, File, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** File + Award composite for licenses / credentials. */
export function LicenseIcon({
	className,
	"aria-hidden": ariaHidden,
	...props
}: LucideProps) {
	return (
		<span
			className={cn("relative inline-flex shrink-0", className)}
			aria-hidden={ariaHidden}
		>
			<File
				className="absolute inset-0 h-full w-full"
				strokeWidth={2}
				{...props}
			/>
			<Award
				className="absolute bottom-[-6%] right-[-8%] h-[68%] w-[68%]"
				strokeWidth={2.25}
				{...props}
			/>
		</span>
	);
}
