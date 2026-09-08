"use client";

import { FileText } from "lucide-react";

interface NegotiationPdfFabProps {
	onOpen: () => void;
}

/** Floating action button to open the generated PDF alongside the text draft. */
export function NegotiationPdfFab({ onOpen }: NegotiationPdfFabProps) {
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label="Open PDF"
			title="Open PDF"
			className="fixed right-6 bottom-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white text-[#0f5384] shadow-lg ring-1 ring-slate-200 transition-all duration-200 hover:shadow-xl hover:ring-blue-300 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
		>
			<FileText className="h-5 w-5" />
		</button>
	);
}
