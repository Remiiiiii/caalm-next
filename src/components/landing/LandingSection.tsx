import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LandingSectionProps {
	id?: string;
	children: ReactNode;
	/** Full-bleed content outside the padded wrapper (marquees, etc.) */
	bleed?: ReactNode;
	className?: string;
	ariaLabelledBy?: string;
	fadeTop?: boolean;
	fadeBottom?: boolean;
	/** Original features-bg.jpg wave pattern + light white blend overlay */
	featuresBg?: boolean;
}

export default function LandingSection({
	id,
	children,
	bleed,
	className,
	ariaLabelledBy,
	fadeTop = true,
	fadeBottom = true,
	featuresBg = false,
}: LandingSectionProps) {
	return (
		<section
			id={id}
			aria-labelledby={ariaLabelledBy}
			className={cn(
				/* overflow-x only — overflow-y:hidden clips frosted card drop shadows */
				"relative scroll-mt-24 py-14 sm:py-16 md:py-20 overflow-x-hidden",
				featuresBg &&
					"bg-[url('/assets/images/features-bg.jpg')] bg-cover bg-center bg-no-repeat",
				className,
			)}
		>
			{featuresBg ? (
				<div
					className="absolute inset-0 z-0 bg-white/20 pointer-events-none"
					aria-hidden
				/>
			) : null}
			{fadeTop ? <div className="section-fade-top" aria-hidden /> : null}
			{fadeBottom ? <div className="section-fade-bottom" aria-hidden /> : null}
			<div className="relative z-[2] w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				{children}
			</div>
			{bleed ? <div className="relative z-[2] w-full mt-8">{bleed}</div> : null}
		</section>
	);
}
