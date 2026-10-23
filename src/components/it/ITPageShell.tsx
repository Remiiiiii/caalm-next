import type { ReactNode } from "react";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ITPageShellProps {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
	/** Full-width row below title + description, right-aligned (e.g. tenant switcher, Refresh). */
	headerControls?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function ITPageShell({
	title,
	subtitle,
	actions,
	headerControls,
	children,
	className,
}: ITPageShellProps) {
	return (
		<div className={cn("w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6", className)}>
			<div className="flex items-center gap-4 mb-4 justify-between flex-wrap w-full">
				<div>
					<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
					{subtitle ? (
						<p className="text-sm text-slate-600 mt-1">{subtitle}</p>
					) : null}
				</div>
				{actions}
			</div>
			{headerControls ? (
				<div className="mb-4 flex flex-wrap items-center justify-end gap-3">
					{headerControls}
				</div>
			) : null}
			{children}
		</div>
	);
}

export function ITGlassPanel({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<GlassCard className={cn("glass-card", className)}>
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 bg-slate-50">{children}</CardContent>
		</GlassCard>
	);
}
