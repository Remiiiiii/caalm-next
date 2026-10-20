"use client";

import { Check, Plus } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	DROPDOWN_ITEM_LABEL_CLASS,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TaskPerson } from "./task-ui";

export const ASSIGN_SIZE = "md" as const; // 32px — matches enlarged add button

export function TaskAssigneePicker({
	assigneeId,
	assigneeName,
	people,
	disabled,
	onChange,
	/** Table cells show avatar only; sheets can show name too */
	showName = false,
}: {
	assigneeId?: string;
	assigneeName?: string;
	people: TaskPerson[];
	disabled?: boolean;
	onChange?: (assigneeId: string | null) => void;
	showName?: boolean;
}) {
	const person = people.find((p) => p.id === assigneeId);
	const name = person?.name || assigneeName;
	const imageUrl = person?.imageUrl;

	const trigger =
		assigneeId && name ? (
			<span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
				<Avatar
					name={name}
					userId={assigneeId}
					size={ASSIGN_SIZE}
					imageUrl={imageUrl}
				/>
				{showName ? name : null}
			</span>
		) : (
			<span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
				<span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300">
					<Plus className="h-4 w-4" />
				</span>
				{showName ? "Assign" : null}
			</span>
		);

	if (!onChange) return trigger;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<button
					type="button"
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"cursor-pointer rounded-md px-1 py-0.5",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						disabled && "cursor-not-allowed opacity-50",
					)}
					aria-label={name ? `Assignee ${name}` : "Assign task"}
				>
					{trigger}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56 overflow-hidden p-1"
				onClick={(e) => e.stopPropagation()}
			>
				<DropdownScrollArea>
					<DropdownMenuItem
						className="cursor-pointer gap-2"
						onSelect={() => onChange(null)}
					>
						<span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300">
							<Plus className="h-4 w-4" />
						</span>
						<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
							Unassigned
						</span>
						{!assigneeId ? <Check className="h-3.5 w-3.5" /> : null}
					</DropdownMenuItem>
					{people.map((p) => (
						<DropdownMenuItem
							key={p.id}
							className="cursor-pointer gap-2"
							onSelect={() => onChange(p.id)}
						>
							<Avatar
								name={p.name}
								userId={p.id}
								size={ASSIGN_SIZE}
								imageUrl={p.imageUrl}
							/>
							<span className="min-w-0 flex-1">
								<span
									className={cn("block truncate", DROPDOWN_ITEM_LABEL_CLASS)}
								>
									{p.name}
								</span>
								{p.subtitle ? (
									<span className="block truncate text-[11px] text-slate-500">
										{p.subtitle}
									</span>
								) : null}
							</span>
							{p.id === assigneeId ? <Check className="h-3.5 w-3.5" /> : null}
						</DropdownMenuItem>
					))}
				</DropdownScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
