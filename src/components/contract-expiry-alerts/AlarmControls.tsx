"use client";

import { BellOff, VolumeOff, X } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";

interface AlarmControlsProps {
	isPlaying: boolean;
	onSilence: () => void;
	onDismiss: () => void;
	variant?: "compact" | "full";
}

export const AlarmControls: React.FC<AlarmControlsProps> = ({
	isPlaying,
	onSilence,
	onDismiss,
	variant = "full",
}) => {
	if (!isPlaying) return null;

	if (variant === "compact") {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onSilence}
				className="h-7 w-7 shrink-0 cursor-pointer p-0 hover:bg-white/40 transition-all duration-200"
				title="Mute alarm for 24 hours"
				aria-label="Mute alarm"
			>
				<VolumeOff className="h-4 w-4 text-slate-600" />
			</Button>
		);
	}

	// Full variant
	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				onClick={onSilence}
				className="h-7 px-2 bg-orange/50 hover:bg-orange/70 border border-orange/50 text-orange"
				title="Silence alarm for 24 hours"
			>
				<BellOff className="h-3 w-3 mr-1" />
				<span className="text-xs">Silence</span>
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={onDismiss}
				className="h-7 w-7 p-0 bg-orange/10 hover:bg-orange/20 border border-orange/30 text-orange"
				title="Dismiss alarm for 24 hours"
			>
				<X className="h-3 w-3" />
			</Button>
		</div>
	);
};
