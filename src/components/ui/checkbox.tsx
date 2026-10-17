import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer group h-4 w-4 shrink-0 rounded-[5px] border border-slate-300 bg-transparent ring-offset-background",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-2",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-[state=checked]:border-[#0f5384] data-[state=checked]:bg-transparent",
			"data-[state=indeterminate]:border-[#0f5384] data-[state=indeterminate]:bg-transparent",
			className,
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator
			className={cn("flex items-center justify-center text-slate-700")}
		>
			<Check
				className="h-3 w-3 text-slate-700 group-data-[state=indeterminate]:hidden"
				strokeWidth={2.5}
			/>
			<Minus
				className="hidden h-3 w-3 text-slate-700 group-data-[state=indeterminate]:block"
				strokeWidth={2.5}
			/>
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
