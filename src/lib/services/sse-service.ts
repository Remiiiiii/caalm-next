/**
 * SSE Service
 * Server-Sent Events service for non-critical real-time updates
 * Used for metrics, logs, and other less time-sensitive data
 */

export type SSEConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

export interface SSEOptions {
	onMessage?: (data: any) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onReconnect?: (attempt: number) => void;
}

export interface SSESubscription {
	close: () => void;
	url: string;
	status: SSEConnectionStatus;
}

/**
 * SSE Service Class
 * Manages Server-Sent Events connections with automatic reconnection
 */
class SSEService {
	private subscriptions: Map<string, EventSource> = new Map();
	private statusListeners: Map<
		string,
		Set<(status: SSEConnectionStatus) => void>
	> = new Map();
	private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
	private reconnectAttempts: Map<string, number> = new Map();
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;

	/**
	 * Subscribe to an SSE endpoint
	 */
	subscribe(url: string, options: SSEOptions = {}): SSESubscription {
		// If already subscribed, close existing connection
		if (this.subscriptions.has(url)) {
			this.unsubscribe(url);
		}

		const eventSource = new EventSource(url);
		let _reconnectAttempts = 0;

		// Connection opened
		eventSource.onopen = () => {
			_reconnectAttempts = 0;
			this.reconnectAttempts.set(url, 0);
			this.updateStatus(url, "connected");
			options.onConnect?.();
		};

		// Listen for messages
		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				options.onMessage?.(data);
			} catch (error) {
				console.error(`[SSEService] Error parsing message from ${url}:`, error);
				// Try to call onMessage with raw data if parsing fails
				options.onMessage?.(event.data);
			}
		};

		// Listen for custom events
		eventSource.addEventListener("notification", (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);
				options.onMessage?.(data);
			} catch (error) {
				console.error(
					`[SSEService] Error parsing notification from ${url}:`,
					error,
				);
			}
		});

		eventSource.addEventListener("heartbeat", () => {
			// Heartbeat received, connection is alive
			this.updateStatus(url, "connected");
		});

		// Handle errors
		eventSource.onerror = (error) => {
			console.error(`[SSEService] Error on SSE connection ${url}:`, error);

			const currentAttempts = this.reconnectAttempts.get(url) || 0;

			if (eventSource.readyState === EventSource.CLOSED) {
				this.updateStatus(url, "disconnected");

				// Attempt reconnection if not exceeded max attempts
				if (currentAttempts < this.maxReconnectAttempts) {
					this.scheduleReconnect(url, options, currentAttempts + 1);
				} else {
					this.updateStatus(url, "error");
					options.onError?.(new Error("Max reconnection attempts reached"));
				}
			} else {
				this.updateStatus(url, "error");
				options.onError?.(new Error("SSE connection error"));
			}
		};

		this.subscriptions.set(url, eventSource);
		this.reconnectAttempts.set(url, 0);
		this.updateStatus(url, "connecting");

		return {
			close: () => {
				this.unsubscribe(url);
			},
			url,
			status: "connecting",
		};
	}

	/**
	 * Unsubscribe from an SSE endpoint
	 */
	unsubscribe(url: string): void {
		const eventSource = this.subscriptions.get(url);

		if (eventSource) {
			eventSource.close();
			this.subscriptions.delete(url);
			this.updateStatus(url, "disconnected");
		}

		// Clear reconnect timer
		const timer = this.reconnectTimers.get(url);
		if (timer) {
			clearTimeout(timer);
			this.reconnectTimers.delete(url);
		}

		this.reconnectAttempts.delete(url);
	}

	/**
	 * Unsubscribe from all endpoints
	 */
	unsubscribeAll(): void {
		this.subscriptions.forEach((_eventSource, url) => {
			this.unsubscribe(url);
		});
	}

	/**
	 * Get connection status for an endpoint
	 */
	getStatus(url: string): SSEConnectionStatus {
		const eventSource = this.subscriptions.get(url);

		if (!eventSource) {
			return "disconnected";
		}

		switch (eventSource.readyState) {
			case EventSource.CONNECTING:
				return "connecting";
			case EventSource.OPEN:
				return "connected";
			case EventSource.CLOSED:
				return "disconnected";
			default:
				return "error";
		}
	}

	/**
	 * Subscribe to status changes for an endpoint
	 */
	onStatusChange(
		url: string,
		listener: (status: SSEConnectionStatus) => void,
	): () => void {
		if (!this.statusListeners.has(url)) {
			this.statusListeners.set(url, new Set());
		}

		this.statusListeners.get(url)?.add(listener);

		// Return unsubscribe function
		return () => {
			const listeners = this.statusListeners.get(url);
			if (listeners) {
				listeners.delete(listener);
			}
		};
	}

	/**
	 * Update status and notify listeners
	 */
	private updateStatus(url: string, status: SSEConnectionStatus): void {
		const listeners = this.statusListeners.get(url);
		if (listeners) {
			listeners.forEach((listener) => {
				try {
					listener(status);
				} catch (error) {
					console.error(
						`[SSEService] Error in status listener for ${url}:`,
						error,
					);
				}
			});
		}
	}

	/**
	 * Schedule reconnection with exponential backoff
	 */
	private scheduleReconnect(
		url: string,
		options: SSEOptions,
		attempt: number,
	): void {
		// Clear existing timer
		const existingTimer = this.reconnectTimers.get(url);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		this.reconnectAttempts.set(url, attempt);
		const delay = this.reconnectDelay * 2 ** (attempt - 1);

		const timer = setTimeout(() => {
			this.reconnectTimers.delete(url);
			this.updateStatus(url, "connecting");
			options.onReconnect?.(attempt);

			// Resubscribe
			this.subscribe(url, options);
		}, delay);

		this.reconnectTimers.set(url, timer);
	}
}

/**
 * Global SSE Service instance
 */
export const sseService = new SSEService();

/**
 * Helper function to subscribe to an SSE endpoint
 */
export function subscribeToSSE(
	url: string,
	options: SSEOptions = {},
): SSESubscription {
	return sseService.subscribe(url, options);
}

/**
 * Helper function to unsubscribe from an SSE endpoint
 */
export function unsubscribeFromSSE(url: string): void {
	sseService.unsubscribe(url);
}
