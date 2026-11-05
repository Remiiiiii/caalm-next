"use client";

import { useEffect, useState } from "react";
import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";
import AssistantResearchTrace from "@/components/assistant/AssistantResearchTrace";

const STEP_MS = 220;

export default function AssistantResearchTracePlayback({
	steps,
	autoPlayback,
	collapsibleWhenDone,
	onPlaybackComplete,
}: {
	steps: AssistantResearchStep[];
	autoPlayback?: boolean;
	collapsibleWhenDone?: boolean;
	onPlaybackComplete?: () => void;
}) {
	const [playbackIndex, setPlaybackIndex] = useState<number | undefined>(
		autoPlayback ? 0 : undefined,
	);
	const [playbackDone, setPlaybackDone] = useState(!autoPlayback);

	useEffect(() => {
		if (!autoPlayback || !steps.length) {
			setPlaybackIndex(undefined);
			setPlaybackDone(true);
			return;
		}
		setPlaybackIndex(0);
		setPlaybackDone(false);
		let index = 0;
		const timer = window.setInterval(() => {
			index += 1;
			if (index >= steps.length) {
				window.clearInterval(timer);
				setPlaybackIndex(undefined);
				setPlaybackDone(true);
				onPlaybackComplete?.();
				return;
			}
			setPlaybackIndex(index);
		}, STEP_MS);
		return () => window.clearInterval(timer);
	}, [autoPlayback, onPlaybackComplete, steps]);

	return (
		<AssistantResearchTrace
			steps={steps}
			playbackIndex={playbackDone ? undefined : playbackIndex}
			collapsible={Boolean(collapsibleWhenDone && playbackDone)}
			defaultCollapsed={Boolean(collapsibleWhenDone && playbackDone)}
		/>
	);
}
