"use client";

import { Check, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	defaultProblemPageUrl,
	PROBLEM_PAGE_URL_HELP,
} from "@/lib/tickets/problem-page-url";
import { cn } from "@/lib/utils";

const FILL_CURRENT_PAGE_HINT =
	"Puts this screen's address in the box. Change the address first if the problem is somewhere else.";

const UPDATE_PAGE_HINT =
	"Change the address, then press this to use it for recording and your ticket.";

type Props = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	error?: string | null;
	compact?: boolean;
	currentPathname?: string;
	className?: string;
	/** Swaps "Use the page I'm on" for an "Update page" button that applies typed changes. */
	confirm?: {
		dirty: boolean;
		justUpdated: boolean;
		onUpdate: () => void;
	};
};

export function ProblemPageUrlField({
	id,
	value,
	onChange,
	onBlur,
	error,
	compact,
	currentPathname,
	className,
	confirm,
}: Props) {
	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={id} className="text-sm font-medium text-slate-700">
				Page where it happened <span className="text-red">*</span>
			</Label>
			<details className="text-xs text-slate-500">
				<summary className="cursor-pointer rounded-sm font-medium text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-2">
					How to copy the page address
				</summary>
				<ol className="mt-2 list-decimal space-y-1 pl-4">
					{PROBLEM_PAGE_URL_HELP.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
			</details>

			<div className="flex flex-wrap gap-2">
				<Input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder="https://… or /contracts"
					required
					aria-describedby={`${id}-help`}
					className={cn(
						"min-w-0 flex-1 border-[0.25px] border-slate-300 bg-white text-sm text-slate-700",
						error && "border-red/60",
					)}
					aria-invalid={error ? true : undefined}
				/>
				<TooltipProvider delayDuration={200}>
					<Tooltip>
						<TooltipTrigger asChild>
							{confirm ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className={cn(
										"h-10 shrink-0 border-[0.25px] border-slate-300 text-slate-700 transition-opacity duration-200",
										!confirm.dirty && !confirm.justUpdated && "opacity-50",
									)}
									aria-disabled={!confirm.dirty}
									onClick={() => {
										if (confirm.dirty) confirm.onUpdate();
									}}
								>
									{confirm.justUpdated && !confirm.dirty ? (
										<Check className="h-4 w-4" aria-hidden />
									) : (
										<RefreshCw className="h-4 w-4" aria-hidden />
									)}
									{confirm.justUpdated && !confirm.dirty
										? "Updated"
										: "Update page"}
								</Button>
							) : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 shrink-0 border-[0.25px] border-slate-300 text-slate-700"
									aria-label="Use the page I'm on — fill the box with this screen's address"
									onClick={() => {
										onChange(
											defaultProblemPageUrl(
												currentPathname || window.location.pathname,
											),
										);
									}}
								>
									<Link2 className="h-4 w-4" aria-hidden />
									Use the page I'm on
								</Button>
							)}
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">
							{confirm ? UPDATE_PAGE_HINT : FILL_CURRENT_PAGE_HINT}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<p id={`${id}-help`} className="text-xs text-slate-500">
				{compact
					? "We open this address when you record."
					: "We open this page when you start recording."}
			</p>

			{error ? (
				<p className="text-xs text-red" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
