"use client";

import type { ReactNode } from "react";

interface AnalyticsPageShellProps {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function AnalyticsPageShell({
	title,
	subtitle,
	actions,
	children,
}: AnalyticsPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex items-center gap-4 mb-2 justify-start self-start w-full">
						<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
					</div>
					{subtitle ? (
						<p className="text-sm text-slate-600 max-w-2xl">{subtitle}</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex items-center gap-3 shrink-0">{actions}</div>
				) : null}
			</div>
			{children}
		</div>
	);
}
