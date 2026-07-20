"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	CircleAlert,
	ClipboardList,
	FileText,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type {
	DepartmentActionItem,
	DepartmentActionPriority,
} from "@/lib/dashboard/department-dashboard.types";

const PRIORITY_STYLES: Record<DepartmentActionPriority, string> = {
	high: "bg-red/10 text-red border-red/20",
	medium: "bg-orange/10 text-orange border-orange/20",
	low: "bg-slate-100 text-slate-600 border-slate-200",
};

function ActionIcon({ type }: { type: DepartmentActionItem["type"] }) {
	switch (type) {
		case "approval":
			return <Calendar className="h-4 w-4 text-[#0f5384]" />;
		case "contract_expiry":
			return <AlertTriangle className="h-4 w-4 text-orange" />;
		case "contract_review":
			return <ClipboardList className="h-4 w-4 text-[#0f5384]" />;
		case "license":
			return <CircleAlert className="h-4 w-4 text-orange" />;
		default:
			return <FileText className="h-4 w-4 text-[#0f5384]" />;
	}
}

interface DepartmentActionQueueProps {
	items: DepartmentActionItem[];
	isLoading?: boolean;
}

export function DepartmentActionQueue({
	items,
	isLoading,
}: DepartmentActionQueueProps) {
	return (
		<Card className="glass-card h-full w-full flex flex-col">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
				<div className="flex items-center justify-between mb-4 shrink-0">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							Things to do
						</p>
						<p className="text-xs text-slate-600 mt-1">
							Prioritized actions for your division
						</p>
					</div>
				</div>

				{isLoading ? (
					<div className="space-y-3 flex-1">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-14 rounded-lg bg-slate-200/60 animate-pulse"
							/>
						))}
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
						<CheckCircle2 className="h-10 w-10 text-green mb-3" />
						<p className="text-sm font-medium text-slate-900">
							You're caught up
						</p>
						<p className="text-xs text-slate-600 mt-1 max-w-sm">
							No pending approvals or contracts needing attention right now.
						</p>
						<Link
							href="/calendar"
							className="text-sm text-[#0f5384] hover:underline mt-3 cursor-pointer"
						>
							Open calendar
						</Link>
					</div>
				) : (
					<ul className="space-y-2 flex-1 overflow-y-auto min-h-0">
						{items.map((item) => (
							<li key={item.id}>
								<Link
									href={item.href}
									className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-3 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
										<ActionIcon type={item.type} />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-medium text-slate-900">
											{item.title}
										</span>
										<span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
											{item.meta ? <span>{item.meta}</span> : null}
											{item.dueDate ? (
												<span>
													Due{" "}
													{new Date(item.dueDate).toLocaleDateString(undefined, {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</span>
											) : null}
										</span>
									</span>
									<span
										className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${PRIORITY_STYLES[item.priority]}`}
									>
										{item.priority}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
