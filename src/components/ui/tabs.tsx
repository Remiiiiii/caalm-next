import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<nav className="overflow-visible pb-3">
		<TabsPrimitive.List
			ref={ref}
			className={cn(
				"flex h-auto min-h-10 w-full flex-wrap items-center justify-center overflow-visible rounded-md border border-white/40 bg-white/20 p-1 text-slate-700 backdrop-blur",
				className,
			)}
			{...props}
		/>
	</nav>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			"tabs-underline tabs-underline-outside relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm font-medium text-slate-700 shadow-none transition-colors duration-200",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:bg-white/30 data-[state=active]:text-navy data-[state=active]:shadow-none",
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			"mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			className,
		)}
		{...props}
	/>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
