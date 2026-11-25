/**
 * Realtime Service
 * Centralized service for managing Appwrite Realtime subscriptions
 * Handles connection management, automatic reconnection, and error recovery
 */

import type { RealtimeResponseEvent } from "appwrite";
import { getRealtimeSessionSecret } from "@/lib/actions/auth.actions";
import { client } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";

const SESSION_ROTATE_INTERVAL_MS = 10 * 60 * 1000;
let realtimeAuthPromise: Promise<void> | null = null;

async function mintAndSetRealtimeSession(): Promise<void> {
	try {
		const secret = await getRealtimeSessionSecret();
		if (secret) client.setSession(secret);
	} catch (error) {
		console.error("[RealtimeService] Could not mint realtime session:", error);
	}
}

/**
 * The browser's Appwrite client has no session by default — the app's own
 * session cookie is httpOnly and scoped to this origin, so it never reaches
 * Appwrite Cloud for the Realtime WebSocket handshake, which then connects
 * anonymously. Document-permission-gated collections (`read(Role.user(...))`)
 * never deliver events to an anonymous connection, silently. A session set
 * via `client.setSession(...)` fixes that — Realtime's own auth handshake
 * only ever reads `config.session`, never a JWT. Memoized so only the first
 * subscriber waits on it; re-minted on an interval since (unlike a JWT) a
 * session for the 2FA login path has no short expiry of its own, so this app
 * rotates it — each mint revokes the previous rotation's session first.
 */
function ensureRealtimeAuth(): Promise<void> {
	if (!realtimeAuthPromise) {
		realtimeAuthPromise = mintAndSetRealtimeSession();
		setInterval(
			() => void mintAndSetRealtimeSession(),
			SESSION_ROTATE_INTERVAL_MS,
		);
	}
	return realtimeAuthPromise;
}

export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

export interface SubscriptionOptions {
	onUpdate?: (payload: any) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
}

export interface Subscription {
	unsubscribe: () => void;
	channel: string;
}

/**
 * Realtime Service Class
 * Manages all Appwrite Realtime subscriptions with connection pooling and error recovery
 */
class RealtimeService {
	private subscriptions: Map<string, Subscription> = new Map();
	/** Latest caller's callbacks per channel — the live `client.subscribe` listener reads from here, so a second `subscribe()` call for an already-open channel still gets its `onUpdate` wired up instead of being silently dropped. */
	private channelOptions: Map<string, SubscriptionOptions> = new Map();
	private connectionStatus: ConnectionStatus = "disconnected";
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000; // Start with 1 second
	private reconnectTimer: NodeJS.Timeout | null = null;
	private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

	/**
	 * Subscribe to a collection for real-time updates
	 */
	subscribe(
		collectionId: string,
		options: SubscriptionOptions = {},
	): Subscription {
		const channel = `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`;

		// Always keep the latest caller's callbacks live, even when the channel is already open.
		this.channelOptions.set(channel, options);

		// If already subscribed, reuse the open socket — just point it at the new callbacks above.
		if (this.subscriptions.has(channel)) {
			const existing = this.subscriptions.get(channel)!;
			if (options.onConnect) {
				setTimeout(() => options.onConnect?.(), 100);
			}
			return existing;
		}

		this.setConnectionStatus("connecting");

		// The actual socket subscribe is deferred until the client is JWT-authenticated
		// (see ensureRealtimeAuth) — subscribing while anonymous would silently never
		// receive events for any document-permission-gated collection. `cancelled` guards
		// against an unsubscribe() that happens before this resolves.
		let cancelled = false;
		let rawUnsubscribe: (() => void) | null = null;

		void ensureRealtimeAuth().then(() => {
			if (cancelled) return;
			try {
				rawUnsubscribe = client.subscribe(
					channel,
					(event: RealtimeResponseEvent<Record<string, unknown>>) => {
						this.setConnectionStatus("connected");
						this.reconnectAttempts = 0; // Reset on successful event
						this.reconnectDelay = 1000; // Reset delay

						const current = this.channelOptions.get(channel);
						if (current?.onUpdate) {
							try {
								current.onUpdate(event.payload);
							} catch (error) {
								console.error(
									`[RealtimeService] Error in onUpdate callback for ${channel}:`,
									error,
								);
								if (current.onError) {
									current.onError(
										error instanceof Error ? error : new Error(String(error)),
									);
								}
							}
						}
					},
				);

				if (options.onConnect) {
					setTimeout(() => {
						this.setConnectionStatus("connected");
						options.onConnect?.();
					}, 100);
				}
			} catch (error) {
				this.setConnectionStatus("error");
				console.error(
					`[RealtimeService] Error subscribing to ${channel}:`,
					error,
				);
				if (options.onError) {
					options.onError(
						error instanceof Error ? error : new Error(String(error)),
					);
				}
				this.scheduleReconnect(collectionId, options);
			}
		});

		const subscription: Subscription = {
			unsubscribe: () => {
				cancelled = true;
				try {
					rawUnsubscribe?.();
					this.subscriptions.delete(channel);
					this.channelOptions.delete(channel);

					// If no more subscriptions, update status
					if (this.subscriptions.size === 0) {
						this.setConnectionStatus("disconnected");
					}
				} catch (error) {
					console.error(
						`[RealtimeService] Error unsubscribing from ${channel}:`,
						error,
					);
				}
			},
			channel,
		};

		this.subscriptions.set(channel, subscription);
		return subscription;
	}

	/**
	 * Unsubscribe from a collection
	 */
	unsubscribe(collectionId: string): void {
		const channel = `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`;
		const subscription = this.subscriptions.get(channel);

		if (subscription) {
			subscription.unsubscribe();
		}
	}

	/**
	 * Unsubscribe from all collections
	 */
	unsubscribeAll(): void {
		this.subscriptions.forEach((subscription) => {
			try {
				subscription.unsubscribe();
			} catch (error) {
				console.error(
					`[RealtimeService] Error unsubscribing from ${subscription.channel}:`,
					error,
				);
			}
		});

		this.subscriptions.clear();
		this.channelOptions.clear();
		this.setConnectionStatus("disconnected");
	}

	/**
	 * Get current connection status
	 */
	getConnectionStatus(): ConnectionStatus {
		return this.connectionStatus;
	}

	/**
	 * Subscribe to connection status changes
	 */
	onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
		this.statusListeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.statusListeners.delete(listener);
		};
	}

	/**
	 * Set connection status and notify listeners
	 */
	private setConnectionStatus(status: ConnectionStatus): void {
		if (this.connectionStatus !== status) {
			this.connectionStatus = status;
			this.statusListeners.forEach((listener) => {
				try {
					listener(status);
				} catch (error) {
					console.error("[RealtimeService] Error in status listener:", error);
				}
			});
		}
	}

	/**
	 * Schedule reconnection attempt with exponential backoff
	 */
	private scheduleReconnect(
		collectionId: string,
		options: SubscriptionOptions,
	): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error(
				`[RealtimeService] Max reconnection attempts reached for ${collectionId}`,
			);
			this.setConnectionStatus("error");
			if (options.onError) {
				options.onError(new Error("Max reconnection attempts reached"));
			}
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);

		this.reconnectTimer = setTimeout(() => {
			console.log(
				`[RealtimeService] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${collectionId}`,
			);

			// Try to resubscribe
			this.subscribe(collectionId, {
				...options,
				onConnect: () => {
					this.reconnectAttempts = 0;
					this.reconnectDelay = 1000;
					options.onConnect?.();
				},
				onError: (error) => {
					this.scheduleReconnect(collectionId, options);
					options.onError?.(error);
				},
			});
		}, delay);
	}

	/**
	 * Get all active subscriptions
	 */
	getActiveSubscriptions(): string[] {
		return Array.from(this.subscriptions.keys());
	}
}

/**
 * Global Realtime Service instance
 */
export const realtimeService = new RealtimeService();

/**
 * Helper function to subscribe to a collection
 */
export function subscribeToCollection(
	collectionId: string,
	options: SubscriptionOptions = {},
): Subscription {
	return realtimeService.subscribe(collectionId, options);
}

/**
 * Helper function to unsubscribe from a collection
 */
export function unsubscribeFromCollection(collectionId: string): void {
	realtimeService.unsubscribe(collectionId);
}
