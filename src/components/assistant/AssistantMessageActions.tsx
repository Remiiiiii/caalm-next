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
		"h-7 w-7 cursor-pointer rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

	return (
		<div className="mt-2 flex flex-wrap items-center gap-1">
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
				className={cn(iconBtn, rating === "down" && "text-slate-800")}
				aria-label="Thumbs down"
				aria-pressed={rating === "down"}
				onClick={() => {
					setRating("down");
					onThumbsDown(messageId);
				}}
			>
				<ThumbsDown
					className={cn("h-3.5 w-3.5", rating === "down" && "fill-current")}
				/>
			</Button>
			{showLeaveFeedback || rating === "down" ? (
				<button
					type="button"
					onClick={() => onLeaveFeedback(messageId)}
					className="ml-1 cursor-pointer rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					Leave feedback
				</button>
			) : null}
		</div>
	);
}
