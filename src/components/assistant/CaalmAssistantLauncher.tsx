"use client";

import { useState } from "react";
import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import CaalmAssistantSheet from "@/components/assistant/CaalmAssistantSheet";
import ShimmerBadge from "@/components/landing/ShimmerBadge";
import { PERMISSIONS } from "@/constants/permissions";
import { useCaalmAssistant } from "@/hooks/useCaalmAssistant";
import { usePermissions } from "@/hooks/usePermissions";

export default function CaalmAssistantLauncher() {
	const [visible, setVisible] = useState(false);
	const assistant = useCaalmAssistant();
	const { permissions, loading } = usePermissions();

	if (loading) return null;
	if (!permissions.includes(PERMISSIONS.AI.CHAT)) return null;

	return (
		<>
			<ShimmerBadge
				as="button"
				type="button"
				animateOn="hover"
				onClick={() => setVisible(true)}
				aria-label="Ask CAALM"
				className="h-10 shrink-0"
				innerClassName="h-full bg-white px-3 text-sm font-medium text-[#0f5384]"
			>
				<AssistantAvatar size="xs" />
				Ask CAALM
			</ShimmerBadge>
			<CaalmAssistantSheet
				open={visible}
				onOpenChange={setVisible}
				assistant={assistant}
			/>
		</>
	);
}
