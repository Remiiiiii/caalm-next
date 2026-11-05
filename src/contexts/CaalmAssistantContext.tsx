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
import { unlinkRemediationChat } from "@/lib/assistant/remediation-chat-link";
import {
	nextRemediationAction,
	resolveRemediationConversation,
} from "@/lib/assistant/resolveRemediationConversation";
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

	const openLinkedConversation = useCallback(
		async (conversationId: string) => {
			skipResumeOnOpenRef.current = true;
			setChatTabNonce((n) => n + 1);
			setOpen(true);
			return assistant.selectConversation(conversationId);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- selectConversation is stable
		[assistant.selectConversation],
	);

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
			setIsGuiding(true);
			try {
				const existing = await resolveRemediationConversation(findingId);
				if (nextRemediationAction(existing) === "open" && existing) {
					const opened = await openLinkedConversation(
						existing.conversationId,
					);
					if (opened) return;
					unlinkRemediationChat(findingId);
				}
				skipResumeOnOpenRef.current = true;
				setChatTabNonce((n) => n + 1);
				setOpen(true);
				const started = await assistant.startNewChat();
				if (!started) return;
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
		[
			assistant.sendMessage,
			assistant.startNewChat,
			canChat,
			openLinkedConversation,
		],
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
			const existing = await resolveRemediationConversation(findingId);
			if (!existing) {
				caalmToast.base({
					tone: "info",
					title: "No chat for this finding yet",
					message: "Use Show me how on the finding to start one.",
				});
				return;
			}
			const opened = await openLinkedConversation(existing.conversationId);
			if (opened) return;
			unlinkRemediationChat(findingId);
			caalmToast.base({
				tone: "info",
				title: "No chat for this finding yet",
				message: "Use Show me how on the finding to start one.",
			});
		},
		[canChat, openLinkedConversation],
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
