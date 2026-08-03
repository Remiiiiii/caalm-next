"use client";

import type { ReactNode } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatEnumLabel } from "@/lib/preview/dbFieldOptions";
import { cn } from "@/lib/utils";

export const previewSectionClass =
	"glass-card-inner border-white/55! bg-white/65! shadow-sm";
export const previewSectionHeaderClass =
	"border-b border-white/50 bg-white/45 px-4 py-2.5 backdrop-blur-sm";

export function DetailRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 py-2.5">
			<p className="pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<div className="min-w-0 text-sm font-medium text-slate-900">
				{children}
			</div>
		</div>
	);
}

interface PreviewFieldSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	options: readonly string[];
	placeholder?: string;
	className?: string;
	formatLabel?: (value: string) => string;
}

export function PreviewFieldSelect({
	value,
	onValueChange,
	options,
	placeholder = "Select…",
	className,
	formatLabel = formatEnumLabel,
}: PreviewFieldSelectProps) {
	return (
		<Select value={value || undefined} onValueChange={onValueChange}>
			<SelectTrigger
				className={cn(
					"h-8 w-full border-white/60 bg-white/80 text-sm font-medium text-slate-900",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option} value={option}>
						{formatLabel(option)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface PreviewLabeledSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	options: ReadonlyArray<{ value: string; label: string }>;
	placeholder?: string;
	className?: string;
}

export function PreviewLabeledSelect({
	value,
	onValueChange,
	options,
	placeholder = "Select…",
	className,
}: PreviewLabeledSelectProps) {
	return (
		<Select value={value || undefined} onValueChange={onValueChange}>
			<SelectTrigger
				className={cn(
					"h-8 w-full border-white/60 bg-white/80 text-sm font-medium text-slate-900",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
