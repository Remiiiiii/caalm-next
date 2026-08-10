/**
 * Loading components for use with dynamic imports
 */

import { cn } from "@/lib/utils";

const LOGO_SPINNER_WIDTH = {
	sm: "w-6",
	md: "w-10",
	lg: "w-14",
} as const;

type LogoSpinnerSize = keyof typeof LOGO_SPINNER_WIDTH;

/** Arc rotates clockwise; center mark stays fixed (same viewBox as assets). */
function BrandLogoSpinner({ size }: { size: LogoSpinnerSize }) {
	const widthClass = LOGO_SPINNER_WIDTH[size];
	return (
		<div
			className={cn("relative shrink-0 overflow-visible", widthClass)}
			style={{ aspectRatio: "501 / 498" }}
		>
			{/* Single grid cell so arc and center share one origin (same viewBox on assets). */}
			<div className="pointer-events-none absolute inset-0 grid grid-cols-1 grid-rows-1 place-items-center">
				<div
					className="col-start-1 row-start-1 flex size-full min-h-0 min-w-0 items-center justify-center origin-center animate-spin"
					aria-hidden
				>
					<img
						src="/assets/images/arc_outer.svg"
						alt=""
						className="h-[125%] w-[125%] max-w-none shrink-0 object-contain object-center"
					/>
				</div>
				<img
					src="/assets/images/center_design.svg"
					alt=""
					className="col-start-1 row-start-1 z-10 h-[80%] w-[80%] max-w-none shrink-0 -translate-x-2 object-contain object-center"
					aria-hidden
				/>
			</div>
		</div>
	);
}

interface LoadingSpinnerProps {
	size?: LogoSpinnerSize;
	fullScreen?: boolean;
	/** Visible status text below the spinner */
	label?: string;
	className?: string;
}

export function LoadingSpinner({
	size = "md",
	fullScreen = false,
	label,
	className,
}: LoadingSpinnerProps) {
	const containerClasses = cn(
		fullScreen
			? "flex flex-col items-center justify-center min-h-screen"
			: "flex items-center justify-center p-8",
		label && "flex-col gap-2",
		className,
	);

	return (
		<div
			className={containerClasses}
			role="status"
			aria-label={label || "Loading"}
		>
			<BrandLogoSpinner size={size} />
			{label ? (
				<p className="text-sm text-slate-600 text-center">{label}</p>
			) : (
				<span className="sr-only">Loading...</span>
			)}
		</div>
	);
}

export function LoadingSkeleton() {
	return (
		<div className="animate-pulse space-y-4 p-8">
			<div className="h-4 bg-slate-200 rounded w-3/4"></div>
			<div className="h-4 bg-slate-200 rounded"></div>
			<div className="h-4 bg-slate-200 rounded w-5/6"></div>
		</div>
	);
}

export function LoadingCard() {
	return (
		<div className="animate-pulse bg-white rounded-lg shadow p-6">
			<div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
			<div className="space-y-2">
				<div className="h-4 bg-slate-200 rounded"></div>
				<div className="h-4 bg-slate-200 rounded w-5/6"></div>
				<div className="h-4 bg-slate-200 rounded w-4/6"></div>
			</div>
			<div className="mt-6 flex gap-4">
				<div className="h-10 bg-slate-200 rounded w-24"></div>
				<div className="h-10 bg-slate-200 rounded w-24"></div>
			</div>
		</div>
	);
}
