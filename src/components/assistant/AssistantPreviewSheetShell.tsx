"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AssistantPreviewSheetShellProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Accessible title (visually hidden when compact). */
	title?: string;
	header: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	overlay?: ReactNode;
}

export default function AssistantPreviewSheetShell({
	open,
	onOpenChange,
	title = "CAALM Assistant",
	header,
	children,
	footer,
	overlay,
}: AssistantPreviewSheetShellProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
			<SheetContent
				side="right"
				showOverlay={false}
				onInteractOutside={(e) => e.preventDefault()}
				className={cn(
					"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
					"sm:max-w-md",
					"inset-y-auto! top-4! right-4! bottom-4! h-[calc(100vh-2rem)]! max-h-none!",
					/* Snappy close: drop conflicting CSS transition + shorten slide/duration */
					"transition-none! duration-200! ease-out!",
					"data-[state=open]:duration-200! data-[state=closed]:duration-200!",
					"data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
					"data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
					"pointer-events-auto",
				)}
				showCloseButton={false}
			>
				<div
					className="glass-card-frosted relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
					style={{ background: "rgba(255, 255, 255, 0.92)" }}
				>
					<div className="glass-card-cap rounded-t-2xl!" />

					<SheetTitle className="sr-only">{title}</SheetTitle>

					<div className="mt-4 shrink-0 px-4 pb-3 pt-1">{header}</div>

					<div className="glass-dialog-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-3">
						{children}
					</div>

					{footer ? (
						<div className="shrink-0 border-t border-slate-200/80 bg-white/35 px-5 py-3 backdrop-blur-sm">
							{footer}
						</div>
					) : null}

					{overlay}
				</div>
			</SheetContent>
		</Sheet>
	);
}
