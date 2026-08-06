"use client";

import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	messageId: string;
	content: string;
	showLeaveFeedback: boolean;
	onThumbsDown: (messageId: string) => void;
	onLeaveFeedback: (messageId: string) => void;
	onThumbsUp?: (messageId: string) => void;
};

export default function AssistantMessageActions({
	messageId,
	content,
	showLeaveFeedback,
	onThumbsDown,
	onLeaveFeedback,
	onThumbsUp,
}: Props) {
	const [copied, setCopied] = useState(false);
	const [rating, setRating] = useState<"up" | "down" | null>(null);

	const handleCopy = async () => {
		try {
			const plain = content.replace(/[#*_`]/g, "").trim();
			await navigator.clipboard.writeText(plain || content);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore clipboard failures
		}
	};

	const iconBtn =
		"h-7 w-7 cursor-pointer rounded-md text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

	return (
		<div className="mt-3 border-t border-slate-200/80 pt-2.5">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-slate-400">Was this helpful?</p>
				<div className="flex shrink-0 items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={iconBtn}
						aria-label="Copy response"
						onClick={() => void handleCopy()}
					>
						{copied ? (
							<Check className="h-3.5 w-3.5 text-green-600" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</Button>
					<span
						className="mx-1 h-3.5 w-px bg-slate-200"
						aria-hidden
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={cn(iconBtn, rating === "up" && "text-[#0f5384]")}
						aria-label="Thumbs up"
						aria-pressed={rating === "up"}
						onClick={() => {
							setRating("up");
							onThumbsUp?.(messageId);
						}}
					>
						<ThumbsUp
							className={cn("h-3.5 w-3.5", rating === "up" && "fill-current")}
						/>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={cn(iconBtn, rating === "down" && "text-slate-600")}
						aria-label="Thumbs down"
						aria-pressed={rating === "down"}
						onClick={() => {
							setRating("down");
							onThumbsDown(messageId);
						}}
					>
						<ThumbsDown
							className={cn(
								"h-3.5 w-3.5",
								rating === "down" && "fill-current",
							)}
						/>
					</Button>
				</div>
			</div>
			{showLeaveFeedback || rating === "down" ? (
				<button
					type="button"
					onClick={() => onLeaveFeedback(messageId)}
					className="mt-2 cursor-pointer text-xs font-medium text-slate-500 underline-offset-2 transition-colors duration-200 hover:text-[#0f5384] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					Leave feedback
				</button>
			) : null}
		</div>
	);
}
