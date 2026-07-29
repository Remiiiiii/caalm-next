"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ITPageShellProps {
	title: string;
	subtitle?: string;
	icon?: LucideIcon;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function ITPageShell({
	title,
	subtitle,
	icon: Icon,
	actions,
	children,
	className,
}: ITPageShellProps) {
	return (
		<div
			className={cn(
				"w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6",
				className,
			)}
		>
			<div className="flex items-center gap-4 mb-4 justify-between flex-wrap w-full">
				<div>
					<div className="flex items-center gap-3">
						{Icon ? <Icon className="h-5 w-5 text-[#0f5384]" /> : null}
						<h1 className="text-xl font-semibold sidebar-gradient-text">
							{title}
						</h1>
					</div>
					{subtitle ? (
						<p className="text-sm text-slate-600 mt-1 ml-0 sm:ml-8">{subtitle}</p>
					) : null}
				</div>
				{actions}
			</div>
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
