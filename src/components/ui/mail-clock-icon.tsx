import type { LucideProps } from "lucide-react";
import { forwardRef } from "react";

/** Official Lucide `mail-clock` paths — not shipped in lucide-react 1.31.0 yet. */
export const MailClock = forwardRef<SVGSVGElement, LucideProps>(
	(
		{ className, size = 24, strokeWidth = 2, absoluteStrokeWidth, ...props },
		ref,
	) => (
		<svg
			ref={ref}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={
				absoluteStrokeWidth
					? (Number(strokeWidth) * 24) / Number(size)
					: strokeWidth
			}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			{...props}
		>
			<path d="M18 16.667v1.466l1.067.667" />
			<path d="M22 11.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5" />
			<path d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7" />
			<circle cx="18" cy="18" r="4" />
		</svg>
	),
);
MailClock.displayName = "MailClock";
