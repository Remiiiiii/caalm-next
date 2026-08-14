"use client";

import { Calendar, CheckSquare, ThumbsUp } from "lucide-react";
import type { AssistantActivityFeed } from "@/components/assistant/assistantTypes";
import { cn } from "@/lib/utils";

const KIND_STYLES = {
	schedule: {
		wrap: "bg-[#E4EFEC]",
		icon: "text-[#1F6F5C]",
		Icon: Calendar,
	},
	feedback: {
		wrap: "bg-[#E9EEF3]",
		icon: "text-[#4A6C87]",
		Icon: ThumbsUp,
	},
	task: {
		wrap: "bg-[#F5EBD9]",
		icon: "text-[#96650F]",
		Icon: CheckSquare,
	},
} as const;

export default function AssistantActivityFeedCard({
	feed,
}: {
	feed: AssistantActivityFeed;
}) {
	return (
		<div className="mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_1px_2px_rgba(14,27,46,0.04),0_12px_28px_-16px_rgba(14,27,46,0.16)]">
			<div className="border-b border-slate-100 px-4.5 pb-3.5 pt-3.75">
				<p className="text-[13.5px] font-bold text-slate-700">{feed.title}</p>
			</div>

			<div className="px-4.5 pb-1 pt-1.5">
				{feed.days.map((day, dayIndex) => (
					<div key={day.label}>
						<p className="pt-3 pb-2 text-[9.5px] uppercase tracking-[0.06em] text-slate-400 first:pt-2.5">
							{day.label}
						</p>
						<ul>
							{day.items.map((item, index) => {
								const style = KIND_STYLES[item.kind] ?? KIND_STYLES.task;
								const Icon = style.Icon;
								const isLast =
									dayIndex === feed.days.length - 1 &&
									index === day.items.length - 1;
								return (
									<li
										key={item.id}
										className={cn( "flex gap-2.5 py-2", !isLast && "border-b border-slate-100", )}
									>
										<div
											className={cn( "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", style.wrap, )}
										>
											<Icon
												className={cn("h-3 w-3", style.icon)}
												strokeWidth={2}
												aria-hidden
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-xs leading-snug text-slate-700">
												<span className="font-semibold">{item.verb}</span>
												{item.detail ? (
													<>
														{" "}
														{item.kind === "schedule"
															? `"${item.detail.replace(/^["']|["']$/g, "")}"`
															: item.detail}
													</>
												) : null}
												{item.who ? (
													<span className="font-normal text-slate-500">
														{" "}
														— {item.who}
													</span>
												) : null}
											</p>
											<div className="mt-0.5 flex items-center gap-1.5">
												<span className="text-[10px] text-slate-400">
													{item.whenLabel}
												</span>
												{item.count && item.count > 1 ? (
													<span className="rounded-lg bg-[#F5EBD9] px-1.5 py-px text-[9.5px] font-semibold text-[#96650F]">
														×{item.count}
													</span>
												) : null}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
