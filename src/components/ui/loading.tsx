/**
 * Loading components for use with dynamic imports
 */

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	fullScreen?: boolean;
}

export function LoadingSpinner({
	size = "md",
	fullScreen = false,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-8 h-8",
		lg: "w-12 h-12",
	};

	const containerClasses = fullScreen
		? "flex items-center justify-center min-h-screen"
		: "flex items-center justify-center p-8";

	return (
		<div className={containerClasses}>
			<div
				className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-slate-200 border-t-blue-600`}
				role="status"
				aria-label="Loading"
			>
				<span className="sr-only">Loading...</span>
			</div>
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
