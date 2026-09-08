import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-50 bg-white/10 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<
	typeof DialogPrimitive.Content
> & {
	/** Merged into `DialogOverlay` after defaults (`bg-white/10 backdrop-blur-xs`). */
	overlayClassName?: string;
	/** Corner X. Default on for all variants; set false only to hide it. */
	showCloseButton?: boolean;
	closeButtonClassName?: string;
	/** Backdrop click dismiss. Off for `variant="destructive"`. */
	dismissOnOverlay?: boolean;
	/**
	 * `destructive` = no overlay dismiss by default (safer confirms).
	 * Corner X is on by default for all variants (footer Cancel is omit).
	 * Pass `showCloseButton={false}` only when dismiss must be blocked.
	 */
	variant?: "default" | "destructive";
};

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	DialogContentProps
>(
	(
		{
			className,
			children,
			overlayClassName,
			showCloseButton,
			closeButtonClassName,
			dismissOnOverlay,
			variant = "default",
			onPointerDownOutside,
			...props
		},
		ref,
	) => {
		const isDestructive = variant === "destructive";
		const showX = showCloseButton ?? true;
		const allowOverlay = dismissOnOverlay ?? !isDestructive;

		return (
			<DialogPortal>
				<DialogOverlay className={overlayClassName} />
				<DialogPrimitive.Content
					ref={ref}
					className={cn(
						"fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] max-h-[calc(100vh-2rem)] overflow-y-auto sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 glass-dialog-panel p-4 sm:p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl",
						className,
					)}
					aria-describedby="dialog-description"
					onPointerDownOutside={(event) => {
						if (!allowOverlay) event.preventDefault();
						onPointerDownOutside?.(event);
					}}
					{...props}
				>
					{children}
					{showX ? (
						<DialogPrimitive.Close
							className={cn(
								"absolute right-4 top-5 z-20 cursor-pointer rounded-sm p-1 text-slate-500 transition-colors duration-200",
								"hover:bg-white/80 hover:text-slate-700",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								closeButtonClassName,
							)}
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					) : null}
				</DialogPrimitive.Content>
			</DialogPortal>
		);
	},
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-1.5 text-center sm:text-left",
			className,
		)}
		{...props}
	/>
);
DialogHeader.displayName = "DialogHeader";

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		id="dialog-description"
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg font-semibold leading-none tracking-tight",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
