"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
	initialAgentState,
	reduceAgentEvent,
} from "@/lib/tickets/agent-events";

const EVENT_TYPES = [
	"status",
	"assistant",
	"thinking",
	"tool_call",
	"interaction_update",
	"heartbeat",
	"result",
	"error",
	"done",
] as const;

export type StreamConnection = "connecting" | "open" | "reconnecting" | "ended";

/**
 * Follows the ticket's agent through the server relay. EventSource reconnects
 * on its own, so a page reload or dropped connection picks the feed back up.
 */
export function useAgentStream(
	ticketId: string,
	enabled: boolean,
	/** Bump to reopen the stream, e.g. after a follow-up starts a new run. */
	restartKey = 0,
) {
	const [state, dispatch] = useReducer(reduceAgentEvent, initialAgentState);
	const [connection, setConnection] = useState<StreamConnection>("connecting");

	useEffect(() => {
		if (!enabled) return;
		setConnection("connecting");
		const source = new EventSource(`/api/tickets/${ticketId}/fix-agent/stream`);

		source.onopen = () => setConnection("open");
		for (const type of EVENT_TYPES) {
			source.addEventListener(type, (message) => {
				const raw = (message as MessageEvent).data;
				let data: unknown = raw;
				try {
					data = JSON.parse(raw);
				} catch {
					// Plain-text payloads are fine as they are.
				}
				dispatch({ type, data });
				if (type === "done") {
					setConnection("ended");
					source.close();
				}
			});
		}
		source.onerror = () =>
			setConnection(
				source.readyState === EventSource.CLOSED ? "ended" : "reconnecting",
			);

		return () => source.close();
	}, [ticketId, enabled, restartKey]);

	const sendMessage = useCallback(
		async (text: string): Promise<string | null> => {
			try {
				const res = await fetch(`/api/tickets/${ticketId}/fix-agent/message`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text }),
				});
				if (res.ok) return null;
				const data = await res.json().catch(() => ({}));
				return data.error || "Could not send the message";
			} catch {
				return "Could not send the message";
			}
		},
		[ticketId],
	);

	return { state, connection, sendMessage };
}
