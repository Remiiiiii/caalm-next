"use client";

import { Loader2, MoveUp } from "lucide-react";
import { useComposerAutoGrow } from "@/hooks/useComposerAutoGrow";
import { cn } from "@/lib/utils";

/** Single-line height; grow only with typed text (not after invite replies). */
const COMPOSER_MIN_PX = 44;
const COMPOSER_MAX_PX = 192;

export default function AssistantSheetComposer({
	value,
	onChange,
	onSend,
	disabled,
	sending,
	/** Re-clamp height when the chat thread reflows (message count, etc.). */
	layoutKey,
}: {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	disabled?: boolean;
	sending?: boolean;
	layoutKey?: string | number;
}) {
	const ref = useComposerAutoGrow(
		value,
		COMPOSER_MIN_PX,
		COMPOSER_MAX_PX,
		layoutKey,
	);

	return (
		<div className="relative w-full shrink-0" data-composer="sheet">
			{/* Native textarea: ui/Textarea adds `flex`, which flex-stretch can inflate. */}
			<textarea
				ref={ref}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Ask CAALM anything…"
				rows={1}
				disabled={disabled}
				className={cn(
					"block max-h-48 min-h-11 w-full resize-none overflow-hidden rounded-xl bg-white text-[13px] leading-5 text-slate-700 shadow-sm",
					/* pe-14 keeps typed lines clear of the bottom-right send control */
					"border-[0.25px] border-slate-300 px-4 py-2.5 pe-14",
					"placeholder:text-slate-400",
					"focus-visible:border-[#078FAB] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#078FAB]",
					"disabled:cursor-not-allowed disabled:opacity-50",
				)}
				style={{ maxHeight: COMPOSER_MAX_PX }}
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
