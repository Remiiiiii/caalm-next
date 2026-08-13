import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto h-4 w-4" />
	</DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
	DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
			className,
		)}
		{...props}
	/>
));
DropdownMenuSubContent.displayName =
	DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				"relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-white/30 bg-white/10 p-1 pt-4 text-slate-700 shadow-md backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 before:absolute before:top-0 before:left-0 before:right-0 before:h-4 before:rounded-t-md before:bg-[#d6d7d8] before:opacity-70",
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Check className="h-4 w-4" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
	DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 py-1.5 text-sm font-semibold",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px bg-slate-200/80", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
			{...props}
		/>
	);
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

type AppDropdownMenuTone =
	| "default"
	| "danger"
	| "info"
	| "success"
	| "warning";

const APP_DROPDOWN_TONE_CLASSES: Record<
	AppDropdownMenuTone,
	{ iconWrap: string; label: string }
> = {
	default: {
		iconWrap: "bg-slate-200/70 text-slate-700",
		label: "text-slate-800",
	},
	danger: {
		iconWrap: "bg-red/15 text-red",
		label: "text-red",
	},
	info: {
		iconWrap: "bg-blue/15 text-[#0f5384]",
		label: "text-slate-800",
	},
	success: {
		iconWrap: "bg-green/15 text-green",
		label: "text-slate-800",
	},
	warning: {
		iconWrap: "bg-yellow/20 text-yellow",
		label: "text-slate-800",
	},
};

const AppDropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
		contentClassName?: string;
	}
>(({ className, contentClassName, children, ...props }, ref) => (
	<DropdownMenuContent
		ref={ref}
		className={cn(
			"relative min-w-[12rem] overflow-hidden border border-white/30 bg-white/10 p-0 text-slate-700 backdrop-blur",
			className,
		)}
		{...props}
	>
		<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
		<div className={cn("px-1 pb-1 pt-4", contentClassName)}>{children}</div>
	</DropdownMenuContent>
));
AppDropdownMenuContent.displayName = "AppDropdownMenuContent";

const AppDropdownMenuTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<DropdownMenuTrigger
		ref={ref}
		className={cn(
			"shad-no-focus rounded-full border border-white/40 bg-white/20 p-1 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white/30",
			className,
		)}
		{...props}
	/>
));
AppDropdownMenuTrigger.displayName = "AppDropdownMenuTrigger";

const AppDropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		icon: LucideIcon;
		tone?: AppDropdownMenuTone;
		iconClassName?: string;
	}
>(
	(
		{
			className,
			children,
			icon: Icon,
			tone = "default",
			iconClassName,
			...props
		},
		ref,
	) => (
		<DropdownMenuItem
			ref={ref}
			className={cn("shad-dropdown-item gap-2", className)}
			{...props}
		>
			<span
				className={cn(
					"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
					APP_DROPDOWN_TONE_CLASSES[tone].iconWrap,
				)}
			>
				<Icon className={cn("h-3.5 w-3.5", iconClassName)} />
			</span>
			<span className={cn(APP_DROPDOWN_TONE_CLASSES[tone].label)}>
				{children}
			</span>
		</DropdownMenuItem>
	),
);
AppDropdownMenuItem.displayName = "AppDropdownMenuItem";

const AppDropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & {
		icon: LucideIcon;
		tone?: AppDropdownMenuTone;
	}
>(({ className, children, icon: Icon, tone = "default", ...props }, ref) => (
	<DropdownMenuCheckboxItem
		ref={ref}
		className={cn("pl-8 pr-2", className)}
		{...props}
	>
		<div className="ml-2 flex items-center gap-2">
			<span
				className={cn(
					"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
					APP_DROPDOWN_TONE_CLASSES[tone].iconWrap,
				)}
			>
				<Icon className="h-3.5 w-3.5" />
			</span>
			<span className={cn(APP_DROPDOWN_TONE_CLASSES[tone].label)}>
				{children}
			</span>
		</div>
	</DropdownMenuCheckboxItem>
));
AppDropdownMenuCheckboxItem.displayName = "AppDropdownMenuCheckboxItem";

export {
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
