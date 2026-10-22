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
		<div
			className={cn(
				"flex shrink-0 items-start gap-3 mb-3 mt-6 px-6 pt-3 pb-3 pr-14",
				isDestructive ? "bg-red/5" : "bg-[#eefcfe]/60",
			)}
		>
			<div
				className={cn(
					"flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
					isDestructive
						? "bg-red/10 text-red"
						: "bg-[#078FAB]/10 text-[#0f5384]",
				)}
			>
				{icon}
			</div>
			<div className="min-w-0 pt-0.5">
				{isDestructive ? (
					<AlertDialogTitle className="text-[18px] font-semibold leading-snug text-red">
						{title}
					</AlertDialogTitle>
				) : (
					<DialogTitle className="text-[18px] font-semibold leading-snug text-[#0f5384]">
						{title}
					</DialogTitle>
				)}
				{description ? (
					isDestructive ? (
						<AlertDialogDescription className="mt-1 text-sm text-slate-500">
							{description}
						</AlertDialogDescription>
					) : (
						<DialogDescription className="mt-1 text-sm text-slate-500">
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
		</div>
	);

	const closeButton = (
		<button
			type="button"
			className={cn(
				"absolute right-4 top-4 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-slate-500 transition-colors duration-200",
				"hover:bg-white/80 hover:text-slate-700",
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
