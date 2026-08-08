"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
	xs: "h-6 w-6 outline-2 outline-offset-[-1px]",
	sm: "h-9 w-9 outline-2 outline-offset-[-2px]",
	md: "h-14 w-14 outline-3 outline-offset-[-2px]",
	lg: "h-16 w-16 outline-2 outline-offset-[-2px]",
	hero: "h-24 w-24 outline-3 outline-offset-[-2px]",
} as const;

const SIZE_PX = {
	xs: 24,
	sm: 36,
	md: 56,
	lg: 64,
	hero: 96,
} as const;

export type AssistantAvatarSize = keyof typeof SIZE_CLASS;

type Props = {
	size?: AssistantAvatarSize;
	className?: string;
	priority?: boolean;
	alt?: string;
};

export default function AssistantAvatar({
	size = "md",
	className,
	priority,
	alt = "",
}: Props) {
	const px = SIZE_PX[size];
	return (
		<Image
			src="/assets/images/caalm-assistant.png"
			alt={alt}
			width={px}
			height={px}
			priority={priority}
			className={cn(
				"shrink-0 rounded-full object-contain outline outline-[#D6E8F5]",
				SIZE_CLASS[size],
				className,
			)}
		/>
	);
}
