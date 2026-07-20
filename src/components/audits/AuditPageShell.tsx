"use client";

import type { ReactNode } from "react";

interface AuditPageShellProps {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function AuditPageShell({
	title,
	subtitle,
	actions,
	children,
}: AuditPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-4 mb-1">
						<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
					</div>
					{subtitle ? (
						<p className="text-sm text-slate-600 max-w-3xl">{subtitle}</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 shrink-0">
						{actions}
					</div>
				) : null}
			</div>
			{children}
		</div>
	);
}
