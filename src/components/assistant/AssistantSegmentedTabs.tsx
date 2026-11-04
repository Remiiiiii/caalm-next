"use client";

import { cn } from "@/lib/utils";

export type AssistantSheetTab = "chat" | "focus" | "history";

const TABS: { id: AssistantSheetTab; label: string }[] = [
	{ id: "chat", label: "Chat" },
	{ id: "focus", label: "Focus" },
	{ id: "history", label: "History" },
];

export default function AssistantSegmentedTabs({
	value,
	onChange,
}: {
	value: AssistantSheetTab;
	onChange: (tab: AssistantSheetTab) => void;
}) {
	return (
		<div
			className="flex w-fit shrink-0 rounded-full bg-slate-100 p-0.5"
			role="tablist"
			aria-label="Ask CAALM views"
		>
			{TABS.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={value === tab.id}
					onClick={() => onChange(tab.id)}
					className={cn(
						"cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
						value === tab.id
							? "bg-white text-slate-700 shadow-sm"
							: "text-slate-600 hover:text-slate-700",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
