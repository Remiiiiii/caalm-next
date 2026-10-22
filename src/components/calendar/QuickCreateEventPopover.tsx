"use client";

import { CalendarPlus, Loader2, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { formatInTimezone } from "@/lib/timezone";

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
	const timeZone = useOrgTimezone();
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

	const dateLabel = formatInTimezone(anchorDate, "EEE, MMM d, yyyy", timeZone);

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-w-[400px]"
			icon={<CalendarPlus className="h-5 w-5" />}
			title="Quick create"
			description={dateLabel}
			pending={creating}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={creating}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={!title.trim() || !canCreate || creating}
						onClick={() => void handleCreate()}
					>
						{creating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<CalendarPlus className="h-4 w-4" />
						)}
						{creating ? "Creating..." : "Create"}
					</Button>
				</>
			}
		>
			<div className="space-y-3 pb-1">
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
				<Button
					type="button"
					variant="outline"
					className="w-full rounded-full border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
					onClick={() => onMoreOptions(payload())}
				>
					<MoreHorizontal className="h-4 w-4" />
					More options
				</Button>
			</div>
		</AppDialog>
	);
}

export default QuickCreateEventPopover;
