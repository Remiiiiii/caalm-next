import type { AssistantChatMessage } from "@/components/assistant/assistantTypes";

function formatTimestamp(iso?: string): string {
	const date = iso ? new Date(iso) : new Date();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	const yyyy = date.getFullYear();
	const hh = String(date.getHours()).padStart(2, "0");
	const min = String(date.getMinutes()).padStart(2, "0");
	return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

export function buildAssistantChatTxt(
	messages: AssistantChatMessage[],
): string {
	return messages
		.map((m) => {
			const label = m.role === "user" ? "User" : "CAALM";
			return `[${label}]\n${m.content}\n(${formatTimestamp(m.createdAt)})`;
		})
		.join("\n\n");
}

export function downloadAssistantChatTxt(
	messages: AssistantChatMessage[],
	conversationId?: string | null,
): void {
	const text = buildAssistantChatTxt(messages);
	const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	const id = conversationId || "draft";
	a.href = url;
	a.download = `caalm-chat-${id}.txt`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
