"use client";

import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import ShimmerBadge from "@/components/landing/ShimmerBadge";
import { useCaalmAssistantShell } from "@/contexts/CaalmAssistantContext";

export default function CaalmAssistantLauncher() {
	const { openSheet, canChat, permissionsLoading } = useCaalmAssistantShell();

	if (permissionsLoading) return null;
	if (!canChat) return null;

	return (
		<ShimmerBadge
			as="button"
			type="button"
			animateOn="hover"
			onClick={openSheet}
			aria-label="Ask CAALM"
			className="h-10 shrink-0"
			innerClassName="h-full bg-white px-3 text-sm font-medium text-[#0f5384]"
		>
			<AssistantAvatar size="xs" />
			Ask CAALM
		</ShimmerBadge>
	);
}
