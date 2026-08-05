"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartTone = "light" | "dark";

interface ChartToneSwitchProps {
	tone: ChartTone;
	onChange: (tone: ChartTone) => void;
	className?: string;
}

/** Sliding pill switch: left = light charts (moon visible), right = dark charts (sun visible). */
export function ChartToneSwitch({
	tone,
	onChange,
	className,
}: ChartToneSwitchProps) {
	const isLight = tone === "light";

	return (
		<button
			type="button"
			role="switch"
			aria-checked={!isLight}
			aria-label={
				isLight ? "Switch charts to dark mode" : "Switch charts to light mode"
			}
			onClick={() => onChange(isLight ? "dark" : "light")}
			className={cn(
				"relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full",
				"border border-slate-200 bg-[#e8eaed] p-1",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				className,
			)}
		>
			<span className="pointer-events-none absolute inset-0 z-0 flex items-center justify-between px-2.5">
				<Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden />
				<Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden />
			</span>
			<span
				aria-hidden
				className={cn(
					"relative z-10 block h-6 w-8 rounded-full bg-white shadow-sm",
					"transition-transform duration-200 ease-out",
					isLight ? "translate-x-0" : "translate-x-6",
				)}
			/>
		</button>
	);
}
