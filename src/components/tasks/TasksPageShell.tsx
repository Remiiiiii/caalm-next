"use client";

import type { ReactNode } from "react";

interface TasksPageShellProps {
	title?: string;
	subtitle?: string;
	children: ReactNode;
}

export function TasksPageShell({
	title = "Assign Tasks",
	subtitle = "Create and track compliance work for your team",
	children,
}: TasksPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
			</div>
			<div className="mb-6">
				<p className="flex items-center gap-2 text-sm text-slate-600">
					{subtitle}
				</p>
			</div>
			{children}
		</div>
	);
}
