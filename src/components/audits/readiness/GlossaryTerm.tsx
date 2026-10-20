"use client";

import type { ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY } from "./readiness-ui";

/** Wraps an acronym with its plain-English meaning in a tooltip. */
export function GlossaryTerm({
	term,
	children,
}: {
	term: keyof typeof GLOSSARY | string;
	children?: ReactNode;
}) {
	const meaning = GLOSSARY[term];
	if (!meaning) return <>{children ?? term}</>;
	return (
		<TooltipProvider delayDuration={150}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					>
						{children ?? term}
					</button>
				</TooltipTrigger>
				<TooltipContent className="max-w-xs">{meaning}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
