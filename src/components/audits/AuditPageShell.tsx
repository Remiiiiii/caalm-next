"use client";

import type { ReactNode } from "react";

interface AuditPageShellProps {
	title: string;
	subtitle?: string;
	tags?: string[];
	actions?: ReactNode;
	children: ReactNode;
}

export function AuditPageShell({
	title,
	subtitle,
	tags,
	actions,
	children,
}: AuditPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4">
				<div className="mb-1 flex items-center gap-4">
					<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
				</div>
				{subtitle || actions ? (
					<div className="flex flex-wrap items-center justify-between gap-3">
						{subtitle ? (
							<p className="min-w-0 flex-1 text-sm text-slate-600">
								{subtitle}
							</p>
						) : (
							<span className="min-w-0 flex-1" />
						)}
						{actions ? (
							<div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
								{actions}
							</div>
						) : null}
					</div>
				) : null}
				{tags && tags.length > 0 ? (
					<div className="mt-2.5 flex flex-wrap gap-2">
						{tags.map((tag) => (
							<span
								key={tag}
								className="border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500"
							>
								{tag}
							</span>
						))}
					</div>
				) : null}
			</div>
			{children}
		</div>
	);
}
