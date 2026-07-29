"use client";

import { CheckSquare, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface TasksPageShellProps {
	title?: string;
	subtitle?: string;
	onCreate?: () => void;
	canCreate?: boolean;
	children: ReactNode;
}

export function TasksPageShell({
	title = "Assign Tasks",
	subtitle = "Create and track compliance work for your team",
	onCreate,
	canCreate = false,
	children,
}: TasksPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
			</div>
			<div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
				<p className="text-sm text-slate-600 flex items-center gap-2">
					<CheckSquare className="h-4 w-4 text-[#0f5384]" />
					{subtitle}
				</p>
				{canCreate && onCreate ? (
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={onCreate}
					>
						<Plus className="h-4 w-4" />
						New task
					</Button>
				) : null}
			</div>
			{children}
		</div>
	);
}
