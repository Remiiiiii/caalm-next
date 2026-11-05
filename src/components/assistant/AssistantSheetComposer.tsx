"use client";

import { Loader2, MoveUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function AssistantSheetComposer({
	value,
	onChange,
	onSend,
	disabled,
	sending,
}: {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	disabled?: boolean;
	sending?: boolean;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		const next = Math.min(el.scrollHeight, 192);
		el.style.height = `${Math.max(80, next)}px`;
	}, [value]);

	return (
		<div className="relative w-full">
			<Textarea
				ref={ref}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Ask CAALM anything…"
				rows={1}
				disabled={disabled}
				className={cn(
					"max-h-48 min-h-20 w-full resize-none overflow-y-auto rounded-xl bg-white text-[13px] text-slate-700 shadow-sm",
					"border-[0.25px] border-slate-300! px-4! py-2.5! pe-14! pb-11!",
					"placeholder:text-slate-400 focus-visible:border-[#078FAB]! focus-visible:ring-[#078FAB]",
				)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						onSend();
					}
				}}
			/>
			<button
				type="button"
				onClick={onSend}
				disabled={disabled || sending || !value.trim()}
				aria-label="Send message"
				className={cn(
					"absolute bottom-2 right-2 z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-sm",
					"disabled:pointer-events-none disabled:opacity-40",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				)}
				style={{
					backgroundImage:
						"linear-gradient(135deg, var(--chat-q-from) 0%, var(--chat-q-to) 100%)",
				}}
			>
				{sending ? (
					<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
				) : (
					<MoveUp className="h-4 w-4" aria-hidden />
				)}
			</button>
		</div>
	);
}
