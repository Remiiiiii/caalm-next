"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface EntityPreviewSheetShellProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	icon: LucideIcon;
	statusBanner?: ReactNode;
	children: ReactNode;
	footer: ReactNode;
	maxWidth?: "md" | "lg";
}

export default function EntityPreviewSheetShell({
	open,
	onOpenChange,
	title,
	description,
	icon: Icon,
	statusBanner,
	children,
	footer,
	maxWidth = "md",
}: EntityPreviewSheetShellProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className={cn(
					"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
					maxWidth === "lg" ? "sm:max-w-lg" : "sm:max-w-md",
					"inset-y-auto! top-4! right-4! bottom-auto! h-auto! max-h-[calc(100vh-2rem)]",
					"data-[state=closed]:slide-out-to-right-52 data-[state=open]:slide-in-from-right-52",
				)}
			>
				<div className="glass-card-frosted flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl">
					<div className="glass-card-cap rounded-t-2xl!" />

					<SheetHeader className="glass-dialog-wizard-header mt-4 space-y-3 px-5 py-4 text-left">
						<div className="flex items-start gap-3 pr-6">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-sm">
								<Icon className="h-5 w-5 text-[#0f5384]" />
							</div>
							<div className="min-w-0 flex-1">
								<SheetTitle className="truncate text-lg font-semibold leading-snug sidebar-gradient-text">
									{title}
								</SheetTitle>
								{description ? (
									<SheetDescription className="mt-1 text-sm text-slate-600">
										{description}
									</SheetDescription>
								) : null}
							</div>
						</div>
					</SheetHeader>

					{statusBanner}

					<div className="glass-dialog-scroll-area space-y-4 px-5 py-4">
						{children}
					</div>

					<div className="glass-dialog-footer-compact px-5 py-3.5">
						{footer}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
