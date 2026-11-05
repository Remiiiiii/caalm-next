"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import CaalmAssistantSheet from "@/components/assistant/CaalmAssistantSheet";
import { PERMISSIONS } from "@/constants/permissions";
import { useCaalmAssistant } from "@/hooks/useCaalmAssistant";
import { usePermissions } from "@/hooks/usePermissions";
import { auditRemediationUserPrompt } from "@/lib/assistant/audit-remediation-context";
import { getRemediationChatId } from "@/lib/assistant/remediation-chat-link";
import { caalmToast } from "@/lib/ui/caalm-toast";

type StartAuditRemediationGuideArgs = {
	findingId: string;
	documentId: string;
	findingCode?: string | null;
	findingTitle: string;
};

type CaalmAssistantShellValue = {
	openSheet: () => void;
	startAuditRemediationGuide: (
		args: StartAuditRemediationGuideArgs,
	) => Promise<void>;
	/** Re-open the Show me how conversation linked to this finding (if any). */
	openRemediationChat: (findingId: string) => Promise<void>;
	canChat: boolean;
	permissionsLoading: boolean;
	isGuiding: boolean;
};

const CaalmAssistantContext = createContext<CaalmAssistantShellValue | null>(
	null,
);

export function CaalmAssistantProvider({ children }: { children: ReactNode }) {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const canChat = permissions.includes(PERMISSIONS.AI.CHAT);
	const assistant = useCaalmAssistant({ enabled: canChat });
	const [open, setOpen] = useState(false);
	const [isGuiding, setIsGuiding] = useState(false);
	const [chatTabNonce, setChatTabNonce] = useState(0);
	const skipResumeOnOpenRef = useRef(false);

	const openSheet = useCallback(() => {
		if (!canChat) return;
		setOpen(true);
	}, [canChat]);

	const startAuditRemediationGuide = useCallback(
		async ({
			findingId,
			documentId,
			findingCode,
			findingTitle,
		}: StartAuditRemediationGuideArgs) => {
			if (!canChat) {
				caalmToast.base({
					tone: "error",
					title: "Ask CAALM is not available",
					message: "Your role does not include AI chat.",
				});
				return;
			}
			skipResumeOnOpenRef.current = true;
			setChatTabNonce((n) => n + 1);
			setOpen(true);
			setIsGuiding(true);
			try {
				const started = await assistant.startNewChat();
				if (!started) return;
				// sendMessage links the finding to this conversation (with plan outcome) internally.
				await assistant.sendMessage(
					auditRemediationUserPrompt(findingCode, findingTitle),
					{
						launchContext: {
							kind: "audit_remediation",
							findingId,
							documentId,
						},
					},
				);
			} finally {
				setIsGuiding(false);
			}
		},
		// startNewChat / sendMessage stay stable; `assistant` is a new object each render.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- see above
		[assistant.sendMessage, assistant.startNewChat, canChat],
	);

	const openRemediationChat = useCallback(
		async (findingId: string) => {
			if (!canChat) {
				caalmToast.base({
					tone: "error",
					title: "Ask CAALM is not available",
					message: "Your role does not include AI chat.",
				});
				return;
			}
			const conversationId = getRemediationChatId(findingId);
			if (!conversationId) {
				caalmToast.base({
					tone: "info",
					title: "No chat for this finding yet",
					message: "Use Show me how on the finding to start one.",
				});
				return;
			}
			skipResumeOnOpenRef.current = true;
			setChatTabNonce((n) => n + 1);
			setOpen(true);
			await assistant.selectConversation(conversationId);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- selectConversation is stable
		[assistant.selectConversation, canChat],
	);

	const value = useMemo<CaalmAssistantShellValue>(
		() => ({
			openSheet,
			startAuditRemediationGuide,
			openRemediationChat,
			canChat,
			permissionsLoading,
			isGuiding,
		}),
		[
			openSheet,
			startAuditRemediationGuide,
			openRemediationChat,
			canChat,
			permissionsLoading,
			isGuiding,
		],
	);

	return (
		<CaalmAssistantContext.Provider value={value}>
			{children}
			{canChat ? (
				<CaalmAssistantSheet
					open={open}
					onOpenChange={setOpen}
					assistant={assistant}
					skipResumeOnOpenRef={skipResumeOnOpenRef}
					chatTabNonce={chatTabNonce}
				/>
			) : null}
		</CaalmAssistantContext.Provider>
	);
}

export function useCaalmAssistantShell(): CaalmAssistantShellValue {
	const ctx = useContext(CaalmAssistantContext);
	if (!ctx) {
		throw new Error(
			"useCaalmAssistantShell must be used within CaalmAssistantProvider",
		);
	}
	return ctx;
}
