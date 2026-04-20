/**
 * useRealtime Hook
 * React hook for subscribing to Appwrite Realtime updates
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ConnectionStatus,
	realtimeService,
	type Subscription,
	subscribeToCollection,
	unsubscribeFromCollection,
} from "@/lib/services/realtime-service";

export interface UseRealtimeOptions {
	collectionId: string;
	enabled?: boolean;
	onUpdate?: (payload: any) => void;
	onError?: (error: Error) => void;
}

export interface UseRealtimeReturn {
	isConnected: boolean;
	connectionStatus: ConnectionStatus;
	error: Error | null;
	subscribe: (collectionId: string, onUpdate?: (payload: any) => void) => void;
	unsubscribe: (collectionId: string) => void;
}

/**
 * Hook for subscribing to real-time updates from Appwrite collections
 */
export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
	const { collectionId, enabled = true, onUpdate, onError } = options;

	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);
	const [error, setError] = useState<Error | null>(null);
	const subscriptionRef = useRef<Subscription | null>(null);

	// Subscribe to connection status changes
	useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setConnectionStatus(status);
			if (status === "error") {
				setError(new Error("Connection error"));
			} else {
				setError(null);
			}
		});

		return unsubscribe;
	}, []);

	// Subscribe to collection
	useEffect(() => {
		if (!enabled || !collectionId) {
			return;
		}

		try {
			const subscription = subscribeToCollection(collectionId, {
				onUpdate: (payload) => {
					setError(null);
					if (onUpdate) {
						onUpdate(payload);
					}
				},
				onError: (err) => {
					setError(err);
					if (onError) {
						onError(err);
					}
				},
				onConnect: () => {
					setError(null);
				},
			});

			subscriptionRef.current = subscription;
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			setError(error);
			if (onError) {
				onError(error);
			}
		}

		// Cleanup on unmount or when collectionId/enabled changes
		return () => {
			if (subscriptionRef.current) {
				unsubscribeFromCollection(collectionId);
				subscriptionRef.current = null;
			}
		};
	}, [collectionId, enabled, onUpdate, onError]);

	const subscribe = useCallback(
		(newCollectionId: string, updateCallback?: (payload: any) => void) => {
			// Unsubscribe from current if exists
			if (subscriptionRef.current) {
				unsubscribeFromCollection(collectionId);
			}

			// Subscribe to new collection
			const subscription = subscribeToCollection(newCollectionId, {
				onUpdate: updateCallback || onUpdate,
				onError: onError,
			});

			subscriptionRef.current = subscription;
		},
		[collectionId, onUpdate, onError],
	);

	const unsubscribe = useCallback((targetCollectionId: string) => {
		unsubscribeFromCollection(targetCollectionId);
		if (subscriptionRef.current?.channel.includes(targetCollectionId)) {
			subscriptionRef.current = null;
		}
	}, []);

	return {
		isConnected: connectionStatus === "connected",
		connectionStatus,
		error,
		subscribe,
		unsubscribe,
	};
}

/**
 * Hook for subscribing to multiple collections
 */
export function useMultipleRealtime(
	collections: Array<{
		collectionId: string;
		onUpdate?: (payload: any) => void;
	}>,
	enabled: boolean = true,
) {
	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);
	const [errors, setErrors] = useState<Map<string, Error>>(new Map());
	const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());

	// Subscribe to connection status changes
	useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setConnectionStatus(status);
		});

		return unsubscribe;
	}, []);

	// Subscribe to all collections
	useEffect(() => {
		if (!enabled) {
			return;
		}

		collections.forEach(({ collectionId, onUpdate }) => {
			try {
				const subscription = subscribeToCollection(collectionId, {
					onUpdate: (payload) => {
						const newErrors = new Map(errors);
						newErrors.delete(collectionId);
						setErrors(newErrors);
						if (onUpdate) {
							onUpdate(payload);
						}
					},
					onError: (error) => {
						const newErrors = new Map(errors);
						newErrors.set(collectionId, error);
						setErrors(newErrors);
					},
				});

				subscriptionsRef.current.set(collectionId, subscription);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				const newErrors = new Map(errors);
				newErrors.set(collectionId, err);
				setErrors(newErrors);
			}
		});

		// Cleanup
		return () => {
			collections.forEach(({ collectionId }) => {
				unsubscribeFromCollection(collectionId);
				subscriptionsRef.current.delete(collectionId);
			});
		};
	}, [enabled, collections, errors]);

	return {
		isConnected: connectionStatus === "connected",
		connectionStatus,
		errors: Array.from(errors.entries()),
	};
}
