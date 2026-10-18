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

/** Translucent glass panel for menus — never add a card-cap bar on dropdowns */
const GLASS_DROPDOWN_PANEL =
	"z-50 min-w-[8rem] overflow-hidden rounded-md border border-white/30 bg-white/10 p-1 text-slate-700 shadow-md backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			"group flex cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-sm font-normal outline-none transition-colors focus:bg-[#F2F5F9] focus:font-semibold focus:text-[#24446d] data-[state=open]:bg-[#F2F5F9] data-[state=open]:font-semibold data-[state=open]:text-[#24446d] data-[highlighted]:bg-[#F2F5F9] data-[highlighted]:font-semibold data-[highlighted]:text-[#24446d]",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		{/* Pack to the right; 4px gap before the OverlayScrollbars track */}
		<ChevronRight className="ml-1 mr-[4px] h-4 w-4 shrink-0 text-slate-500" />
	</DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
	DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.SubContent
			ref={ref}
			className={cn(GLASS_DROPDOWN_PANEL, className)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
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
			className={cn(GLASS_DROPDOWN_PANEL, className)}
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
			"group relative flex cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-sm font-normal outline-none transition-colors focus:bg-[#F2F5F9] focus:font-semibold focus:text-[#24446d] data-[highlighted]:bg-[#F2F5F9] data-[highlighted]:font-semibold data-[highlighted]:text-[#24446d] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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
			"relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm font-normal outline-none transition-colors focus:bg-[#F2F5F9] focus:font-semibold focus:text-[#24446d] data-[highlighted]:bg-[#F2F5F9] data-[highlighted]:font-semibold data-[highlighted]:text-[#24446d] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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
			"relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm font-normal outline-none transition-colors focus:bg-[#F2F5F9] focus:font-semibold focus:text-[#24446d] data-[highlighted]:bg-[#F2F5F9] data-[highlighted]:font-semibold data-[highlighted]:text-[#24446d] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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

/** Label text inside a menu row — thin by default, bold + navy on highlight */
export const DROPDOWN_ITEM_LABEL_CLASS =
	"font-normal text-slate-700 group-data-[highlighted]:font-semibold group-data-[highlighted]:text-[#24446d] group-data-[state=open]:font-semibold group-data-[state=open]:text-[#24446d] group-focus:font-semibold group-focus:text-[#24446d]";

const APP_DROPDOWN_TONE_CLASSES: Record<
	AppDropdownMenuTone,
	{ iconWrap: string; label: string }
> = {
	default: {
		iconWrap: "bg-slate-200/70 text-slate-700",
		label: DROPDOWN_ITEM_LABEL_CLASS,
	},
	danger: {
		iconWrap: "bg-red/15 text-red",
		// Keep danger red; still bold on hover like other rows
		label:
			"font-normal text-red group-data-[highlighted]:font-semibold group-focus:font-semibold",
	},
	info: {
		iconWrap: "bg-blue/15 text-[#0f5384]",
		label: DROPDOWN_ITEM_LABEL_CLASS,
	},
	success: {
		iconWrap: "bg-green/15 text-green",
		label: DROPDOWN_ITEM_LABEL_CLASS,
	},
	warning: {
		iconWrap: "bg-yellow/20 text-yellow",
		label: DROPDOWN_ITEM_LABEL_CLASS,
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
		className={cn("min-w-[12rem] p-0", className)}
		{...props}
	>
		{/* No card-cap on dropdowns — glass panel only */}
		<div className={cn("p-1", contentClassName)}>{children}</div>
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
