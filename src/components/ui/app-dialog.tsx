"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AppDialogSize = "confirm" | "form";

export function AppDialog({
	open,
	onOpenChange,
	icon,
	title,
	description,
	variant = "default",
	size = "confirm",
	pending = false,
	children,
	footer,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	icon: ReactNode;
	title: string;
	description?: string;
	variant?: "default" | "destructive";
	size?: AppDialogSize;
	pending?: boolean;
	children?: ReactNode;
	footer?: ReactNode;
	className?: string;
}) {
	const isDestructive = variant === "destructive";
	const maxWidth = size === "form" ? "max-w-[520px]" : "max-w-[460px]";

	const handleOpenChange = (next: boolean) => {
		if (pending && !next) return;
		onOpenChange(next);
	};

	const header = (
		<div className="flex shrink-0 flex-col border-b border-slate-200 px-6 pb-4 pt-[22px] pr-12">
			<div className="flex items-center gap-2.5">
				<div
					className={cn(
						"flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border bg-white",
						isDestructive
							? "border-red/20 text-red"
							: "border-[#0f5384]/15 text-[#0f5384]",
					)}
				>
					{icon}
				</div>
				{isDestructive ? (
					<AlertDialogTitle className="text-[17px] font-bold leading-tight tracking-tight text-red">
						{title}
					</AlertDialogTitle>
				) : (
					<DialogTitle className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
						{title}
					</DialogTitle>
				)}
			</div>
			{description ? (
				isDestructive ? (
					<AlertDialogDescription className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
						{description}
					</AlertDialogDescription>
				) : (
					<DialogDescription className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
						{description}
					</DialogDescription>
				)
			) : isDestructive ? (
				<AlertDialogDescription className="sr-only">
					{title}
				</AlertDialogDescription>
			) : (
				<DialogDescription className="sr-only">{title}</DialogDescription>
			)}
		</div>
	);

	const closeButton = (
		<button
			type="button"
			className={cn(
				"absolute right-4 top-5 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-200",
				"hover:bg-black/[.05] hover:text-slate-700",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				"disabled:pointer-events-none disabled:opacity-50",
			)}
			aria-label="Close"
			disabled={pending}
			onClick={() => handleOpenChange(false)}
		>
			<X className="h-4 w-4" />
		</button>
	);

	const panel = (
		<>
			{closeButton}
			{header}
			{children ? (
				<div className="min-h-0 flex-1 overflow-y-auto px-6">{children}</div>
			) : null}
			{footer ? (
				<div className="flex shrink-0 justify-end gap-2.5 p-6">{footer}</div>
			) : null}
		</>
	);

	const contentClass = cn(
		"fixed left-[50%] top-[50%] z-50 flex max-h-[calc(100dvh-2rem)] w-full translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0",
		maxWidth,
		className,
	);

	if (isDestructive) {
		return (
			<AlertDialog open={open} onOpenChange={handleOpenChange}>
				<AlertDialogContent
					className={contentClass}
					aria-busy={pending || undefined}
					onEscapeKeyDown={(event) => {
						if (pending) event.preventDefault();
					}}
				>
					{panel}
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className={contentClass}
				showCloseButton={false}
				dismissOnOverlay={!pending}
				aria-busy={pending || undefined}
				onEscapeKeyDown={(event) => {
					if (pending) event.preventDefault();
				}}
			>
				{panel}
			</DialogContent>
		</Dialog>
	);
}
