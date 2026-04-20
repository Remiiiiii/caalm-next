"use client";

import { BellOff, Minimize2, VolumeOff, X } from "lucide-react";
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
			<div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1 backdrop-blur-sm border border-white/20">
				<Button
					variant="ghost"
					size="sm"
					onClick={onSilence}
					className="h-7 bg-white/90 hover:bg-white/100 rounded-full px-2 py-1 backdrop-blur-md border border-white/20"
					title="Silence alarm for 1 hour"
				>
					<VolumeOff className="h-3 w-3 text-red" />
					<span className="text-xs text-slate-600">Silence</span>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={onDismiss}
					className="h-7 w-7 p-0 bg-white/90 hover:bg-white/100 rounded-full px-2 py-1 backdrop-blur-md border border-white/20"
					title="Dismiss alarm for 24 hours"
				>
					<Minimize2 className="h-3 w-3 text-slate-600" />
				</Button>
			</div>
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
				title="Silence alarm for 1 hour"
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
