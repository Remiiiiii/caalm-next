"use client";

import { CalendarPlus, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";

export type QuickCreateEventType =
	| "meeting"
	| "contract review"
	| "deadline discussion"
	| "internal review"
	| "audit";

export interface QuickCreatePayload {
	title: string;
	date: Date;
	startTime: string;
	endTime: string;
	type: QuickCreateEventType;
}

interface QuickCreateEventPopoverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	anchorDate: Date | null;
	canCreate: boolean;
	creating?: boolean;
	defaultStartTime?: string;
	defaultEndTime?: string;
	onCreate: (payload: QuickCreatePayload) => void | Promise<void>;
	onMoreOptions: (payload: QuickCreatePayload) => void;
}

function addOneHour(time24: string): string {
	const [h, m] = time24.split(":").map(Number);
	const next = ((h || 0) + 1) % 24;
	return `${String(next).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

export function QuickCreateEventPopover({
	open,
	onOpenChange,
	anchorDate,
	canCreate,
	creating = false,
	defaultStartTime = "09:00",
	defaultEndTime,
	onCreate,
	onMoreOptions,
}: QuickCreateEventPopoverProps) {
	const [title, setTitle] = useState("");
	const [startTime, setStartTime] = useState(defaultStartTime);
	const [endTime, setEndTime] = useState(
		defaultEndTime || addOneHour(defaultStartTime),
	);
	const [type, setType] = useState<QuickCreateEventType>("meeting");

	useEffect(() => {
		if (open) {
			setTitle("");
			setStartTime(defaultStartTime);
			setEndTime(defaultEndTime || addOneHour(defaultStartTime));
			setType("meeting");
		}
	}, [open, defaultStartTime, defaultEndTime]);

	if (!anchorDate) return null;

	const payload = (): QuickCreatePayload => ({
		title: title.trim(),
		date: anchorDate,
		startTime,
		endTime,
		type,
	});

	const handleCreate = async () => {
		if (!title.trim() || !canCreate) return;
		await onCreate(payload());
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[400px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Quick create event</DialogTitle>
				</VisuallyHiddenPrimitive.Root>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<CalendarPlus className="w-5 h-5 text-[#0f5384]" />
						<p className="text-xl font-semibold sidebar-gradient-text">
							Quick create
						</p>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						{anchorDate.toLocaleDateString(undefined, {
							weekday: "short",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="qc-title" className="text-xs text-slate-600">
							Title
						</Label>
						<Input
							id="qc-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Event title"
							className="h-9 bg-white"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter") void handleCreate();
							}}
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label htmlFor="qc-start" className="text-xs text-slate-600">
								Start
							</Label>
							<Input
								id="qc-start"
								type="time"
								value={startTime}
								onChange={(e) => {
									setStartTime(e.target.value);
									setEndTime(addOneHour(e.target.value));
								}}
								className="h-9 bg-white"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="qc-end" className="text-xs text-slate-600">
								End
							</Label>
							<Input
								id="qc-end"
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								className="h-9 bg-white"
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-slate-600">Type</Label>
						<Select
							value={type}
							onValueChange={(v) => setType(v as QuickCreateEventType)}
						>
							<SelectTrigger className="h-9 bg-white">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="meeting">Meeting</SelectItem>
								<SelectItem value="contract review">Contract review</SelectItem>
								<SelectItem value="deadline discussion">
									Deadline discussion
								</SelectItem>
								<SelectItem value="internal review">Internal review</SelectItem>
								<SelectItem value="audit">Audit</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={() => onMoreOptions(payload())}
					>
						<MoreHorizontal className="h-4 w-4" />
						More options
					</Button>
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={!title.trim() || !canCreate || creating}
						onClick={() => void handleCreate()}
					>
						{creating ? "Creating..." : "Create"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default QuickCreateEventPopover;
