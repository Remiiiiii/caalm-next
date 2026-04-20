/**
 * Hook for consuming Server-Sent Events (SSE) for real-time notifications
 * Provides automatic reconnection and error handling
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationEvent {
	id: string;
	title: string;
	message: string;
	type: string;
	timestamp: string;
	read: boolean;
}

interface UseNotificationsSSEOptions {
	autoConnect?: boolean;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
}

interface UseNotificationsSSEReturn {
	notifications: NotificationEvent[];
	isConnected: boolean;
	error: string | null;
	connect: () => void;
	disconnect: () => void;
	clearNotifications: () => void;
}

export function useNotificationsSSE(
	options: UseNotificationsSSEOptions = {},
): UseNotificationsSSEReturn {
	const {
		autoConnect = true,
		reconnectInterval = 3000,
		maxReconnectAttempts = 5,
	} = options;

	const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

	const connect = useCallback(() => {
		// Cleanup existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		// Clear previous reconnect timeout
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
		}

		try {
			const eventSource = new EventSource("/api/notifications/sse");
			eventSourceRef.current = eventSource;

			// Connection opened
			eventSource.onopen = () => {
				console.log("SSE connection established");
				setIsConnected(true);
				setError(null);
				reconnectAttemptsRef.current = 0;
			};

			// Listen for connection events
			eventSource.addEventListener("connected", (event) => {
				console.log("SSE connected:", event);
			});

			// Listen for heartbeat events
			eventSource.addEventListener("heartbeat", (event) => {
				// Just keep connection alive, no action needed
				console.log("SSE heartbeat:", event);
			});

			// Listen for notification events
			eventSource.addEventListener("notification", (event) => {
				try {
					const data = JSON.parse(event.data);
					console.log("New notification received:", data);

					setNotifications((prev) => {
						// Avoid duplicates
						const exists = prev.some((n) => n.id === data.id);
						if (exists) return prev;

						// Add new notification at the beginning
						return [data, ...prev];
					});
				} catch (err) {
					console.error("Error parsing notification data:", err);
				}
			});

			// Handle errors
			eventSource.onerror = (err) => {
				console.error("SSE error:", err);
				setIsConnected(false);
				setError("Connection lost");

				// Auto-reconnect with exponential backoff
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = reconnectInterval * 2 ** reconnectAttemptsRef.current;
					reconnectAttemptsRef.current++;

					console.log(
						`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
					);

					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				} else {
					setError(
						`Failed to reconnect after ${maxReconnectAttempts} attempts`,
					);
				}
			};
		} catch (err) {
			console.error("Error creating EventSource:", err);
			setError(err instanceof Error ? err.message : "Failed to connect");
		}
	}, [reconnectInterval, maxReconnectAttempts]);

	const disconnect = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
		}
		setIsConnected(false);
	}, []);

	const clearNotifications = useCallback(() => {
		setNotifications([]);
	}, []);

	// Auto-connect on mount
	useEffect(() => {
		if (autoConnect) {
			connect();
		}

		// Cleanup on unmount
		return () => {
			disconnect();
		};
	}, [autoConnect, connect, disconnect]);

	return {
		notifications,
		isConnected,
		error,
		connect,
		disconnect,
		clearNotifications,
	};
}
