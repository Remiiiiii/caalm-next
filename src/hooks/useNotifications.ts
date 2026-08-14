import React, { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/contexts/AuthContext";
import type {
	CreateNotificationRequest,
	Notification,
	NotificationType,
	UseNotificationsReturn,
	UseNotificationTypesReturn,
} from "@/types/notifications";

// Enhanced fetcher functions
const fetcher = async (url: string) => {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) {
		const errorText = await response.text();
		console.error(`[CLIENT] Failed to fetch notifications from ${url}:`, {
			status: response.status,
			statusText: response.statusText,
			error: errorText,
		});
		throw new Error(
			`Failed to fetch data: ${response.status} ${response.statusText}`,
		);
	}
	const data = await response.json();
	// Stats endpoint: { success, data: { total, unread, read, byPriority, byType } }
	if (
		url.includes("/notifications/stats") &&
		data &&
		typeof data === "object" &&
		data.data !== undefined &&
		typeof data.data === "object" &&
		!Array.isArray(data.data)
	) {
		return { data: data.data };
	}
	// Handle both direct array and wrapped response formats
	if (Array.isArray(data)) {
		return data;
	}
	// API returns { success: true, data: [...] }
	if (data?.data !== undefined && Array.isArray(data.data)) {
		return data.data;
	}
	// If response has rows property (Appwrite format), use it
	if (data?.rows && Array.isArray(data.rows)) {
		return data.rows;
	}
	console.warn("[CLIENT] Unexpected notification response format:", data);
	return [];
};

export const useNotifications = (userId?: string): UseNotificationsReturn => {
	const { user } = useAuth();
	const currentUserId = userId || user?.$id;

	const {
		data: notifications,
		error,
		isLoading,
		mutate: mutateNotifications,
	} = useSWR(
		currentUserId ? `/api/notifications?userId=${currentUserId}` : null,
		fetcher,
		{
			refreshInterval: 60000,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			revalidateOnMount: true,
			dedupingInterval: 10000,
			revalidateIfStale: true,
			keepPreviousData: true,
		},
	);

	const { data: stats } = useSWR(
		currentUserId ? `/api/notifications/stats?userId=${currentUserId}` : null,
		fetcher,
	);

	const markAsRead = async (notificationId: string) => {
		const previousNotifications = notifications;
		const previousUnreadKey = currentUserId
			? `/api/notifications/unread-count?userId=${currentUserId}`
			: null;

		void mutateNotifications(
			(current: Notification[] | undefined) =>
				(current || []).map((notification) =>
					notification.$id === notificationId
						? { ...notification, read: true }
						: notification,
				),
			{ revalidate: false },
		);

		if (currentUserId) {
			void mutate(
				previousUnreadKey!,
				(current: { count?: number } | undefined) => ({
					count: Math.max(0, (current?.count ?? 1) - 1),
				}),
				{ revalidate: false },
			);
		}

		void fetch(`/api/notifications/${notificationId}/read`, { method: "PUT" })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Failed to mark notification as read");
				}
				if (currentUserId) {
					void mutate(`/api/notifications/stats?userId=${currentUserId}`);
					void mutateNotifications();
				}
			})
			.catch((error) => {
				console.error("Failed to mark notification as read:", error);
				void mutateNotifications(previousNotifications, { revalidate: false });
				if (previousUnreadKey) {
					void mutate(previousUnreadKey);
				}
			});
	};

	const markAsUnread = async (notificationId: string) => {
		const previousNotifications = notifications;
		const previousUnreadKey = currentUserId
			? `/api/notifications/unread-count?userId=${currentUserId}`
			: null;

		void mutateNotifications(
			(current: Notification[] | undefined) =>
				(current || []).map((notification) =>
					notification.$id === notificationId
						? { ...notification, read: false }
						: notification,
				),
			{ revalidate: false },
		);

		if (currentUserId) {
			void mutate(
				previousUnreadKey!,
				(current: { count?: number } | undefined) => ({
					count: (current?.count ?? 0) + 1,
				}),
				{ revalidate: false },
			);
		}

		void fetch(`/api/notifications/${notificationId}/unread`, {
			method: "PUT",
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error("Failed to mark notification as unread");
				}
				if (currentUserId) {
					void mutate(`/api/notifications/stats?userId=${currentUserId}`);
					void mutateNotifications();
				}
			})
			.catch((error) => {
				console.error("Failed to mark notification as unread:", error);
				void mutateNotifications(previousNotifications, { revalidate: false });
				if (previousUnreadKey) {
					void mutate(previousUnreadKey);
				}
			});
	};

	const markAllAsRead = async () => {
		const previousNotifications = notifications;
		const previousUnreadKey = currentUserId
			? `/api/notifications/unread-count?userId=${currentUserId}`
			: null;

		void mutateNotifications(
			(current: Notification[] | undefined) =>
				(current || []).map((notification) => ({
					...notification,
					read: true,
				})),
			{ revalidate: false },
		);

		if (currentUserId) {
			void mutate(previousUnreadKey!, { count: 0 }, { revalidate: false });
		}

		try {
			const response = await fetch(
				`/api/notifications/read-all?userId=${currentUserId}`,
				{ method: "PUT" },
			);
			if (!response.ok) {
				throw new Error("Failed to mark all as read");
			}
			if (currentUserId) {
				void mutate(`/api/notifications/stats?userId=${currentUserId}`);
			}
		} catch (error) {
			console.error("Failed to mark all notifications as read:", error);
			void mutateNotifications(previousNotifications, { revalidate: false });
			if (previousUnreadKey) {
				void mutate(previousUnreadKey);
			}
			throw error;
		}
	};

	const deleteNotification = async (notificationId: string) => {
		try {
			// Optimistic update - remove immediately from UI (instant feedback)
			const _optimisticUpdate = mutateNotifications(
				(current: Notification[]) =>
					current?.filter(
						(notification) => notification.$id !== notificationId,
					),
				{ revalidate: false, populateCache: true, rollbackOnError: true },
			);

			// Delete from server
			const deleteResponse = await fetch(
				`/api/notifications/${notificationId}`,
				{
					method: "DELETE",
				},
			);

			if (!deleteResponse.ok) {
				throw new Error("Failed to delete notification");
			}

			// Force immediate revalidation to ensure UI is in sync with database
			// This bypasses cache and fetches fresh data
			await mutateNotifications(undefined, {
				revalidate: true,
				populateCache: true,
			});

			// Revalidate stats and unread count immediately (bypass cache)
			await Promise.all([
				mutate(`/api/notifications/stats?userId=${currentUserId}`, undefined, {
					revalidate: true,
				}),
				mutate(
					`/api/notifications/unread-count?userId=${currentUserId}`,
					undefined,
					{ revalidate: true },
				),
			]);
		} catch (error) {
			console.error("Failed to delete notification:", error);
			// Revert optimistic update on error by revalidating
			await mutateNotifications(undefined, { revalidate: true });
			throw error;
		}
	};

	const createNotification = async (
		notification: CreateNotificationRequest,
	) => {
		try {
			await fetch("/api/notifications", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(notification),
			});

			// Revalidate notifications
			mutate(`/api/notifications?userId=${currentUserId}`);
			mutate(`/api/notifications/stats?userId=${currentUserId}`);
		} catch (error) {
			console.error("Failed to create notification:", error);
			throw error;
		}
	};

	// Handle different response formats from the API
	const notificationsArray: Notification[] = React.useMemo(() => {
		if (!notifications) return [];
		if (Array.isArray(notifications)) return notifications;
		if (
			notifications &&
			typeof notifications === "object" &&
			"data" in notifications &&
			Array.isArray((notifications as { data: Notification[] }).data)
		) {
			return (notifications as { data: Notification[] }).data;
		}
		if (
			notifications &&
			typeof notifications === "object" &&
			"rows" in notifications &&
			Array.isArray((notifications as { rows: Notification[] }).rows)
		) {
			return (notifications as { rows: Notification[] }).rows;
		}
		return [];
	}, [notifications]);

	const revalidateNotifications = useCallback(() => {
		return mutateNotifications(undefined, { revalidate: true });
	}, [mutateNotifications]);

	return {
		notifications: notificationsArray,
		stats: stats?.data || {
			total: 0,
			unread: 0,
			read: 0,
			byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
			byType: {},
		},
		isLoading: isLoading && notificationsArray.length === 0,
		error,
		markAsRead,
		markAsUnread,
		markAllAsRead,
		deleteNotification,
		createNotification,
		mutate: revalidateNotifications,
	};
};

export const useNotificationTypes = (): UseNotificationTypesReturn => {
	const {
		data: notificationTypes,
		error,
		isLoading,
	} = useSWR("/api/notification-types", fetcher, {
		refreshInterval: 300000,
		revalidateOnFocus: false,
	});

	const createNotificationType = async (
		type: Omit<NotificationType, "$id" | "$createdAt" | "$updatedAt">,
	) => {
		try {
			await fetch("/api/notification-types", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(type),
			});

			// Revalidate notification types
			mutate("/api/notification-types");
		} catch (error) {
			console.error("Failed to create notification type:", error);
			throw error;
		}
	};

	const updateNotificationType = async (
		id: string,
		updates: Partial<NotificationType>,
	) => {
		try {
			await fetch(`/api/notification-types/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updates),
			});

			// Revalidate notification types
			mutate("/api/notification-types");
		} catch (error) {
			console.error("Failed to update notification type:", error);
			throw error;
		}
	};

	const deleteNotificationType = async (id: string) => {
		try {
			await fetch(`/api/notification-types/${id}`, {
				method: "DELETE",
			});

			// Revalidate notification types
			mutate("/api/notification-types");
		} catch (error) {
			console.error("Failed to delete notification type:", error);
			throw error;
		}
	};

	return {
		notificationTypes: Array.isArray(notificationTypes)
			? notificationTypes
			: notificationTypes &&
					typeof notificationTypes === "object" &&
					"data" in notificationTypes &&
					Array.isArray((notificationTypes as { data: unknown }).data)
				? (notificationTypes as { data: NotificationType[] }).data
				: [],
		isLoading,
		error,
		createNotificationType,
		updateNotificationType,
		deleteNotificationType,
		mutate: () => mutate("/api/notification-types"),
	};
};

// Utility hook for getting notification type configuration
export const useNotificationTypeConfig = (typeKey: string) => {
	const { notificationTypes } = useNotificationTypes();
	return notificationTypes.find((type) => type.type_key === typeKey);
};

// Fetcher specifically for unread count API
const unreadCountFetcher = async (url: string) => {
	let response: Response;
	try {
		response = await fetch(url, { cache: "no-store" });
	} catch (networkError) {
		const message =
			networkError instanceof Error
				? networkError.message
				: String(networkError);
		console.error(
			`[CLIENT] Failed to fetch unread count from ${url}: network error`,
			message,
		);
		throw new Error(`Failed to fetch unread count: ${message}`);
	}
	if (!response.ok) {
		const errorText = await response.text();
		// Unread badge is best-effort; treat backend failures as zero
		if (response.status >= 500) {
			console.warn(
				`[CLIENT] Unread count unavailable (${response.status}); using 0`,
			);
			return { count: 0 };
		}
		const details = {
			status: response.status,
			statusText: response.statusText,
			body: errorText || "(empty)",
		};
		console.error(
			`[CLIENT] Failed to fetch unread count from ${url}:`,
			JSON.stringify(details),
		);
		throw new Error(
			`Failed to fetch unread count: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`,
		);
	}
	const data = await response.json();
	// API returns { success: true, data: { count } }
	if (data?.data && typeof data.data.count === "number") {
		return { count: data.data.count };
	}
	// The unread-count API may return { count: number } directly
	if (data && typeof data.count === "number") {
		return data;
	}
	// Fallback: if response is just a number
	if (typeof data === "number") {
		return { count: data };
	}
	console.warn("[CLIENT] Unexpected unread count response format:", data);
	return { count: 0 };
};

// Hook for getting unread count
export const useUnreadCount = (userId?: string) => {
	const { user } = useAuth();
	const currentUserId = userId || user?.$id;

	const { data, error, isLoading, mutate } = useSWR(
		currentUserId
			? `/api/notifications/unread-count?userId=${currentUserId}`
			: null,
		unreadCountFetcher,
		{
			refreshInterval: 30000,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			revalidateOnMount: true,
			dedupingInterval: 10000,
			revalidateIfStale: true,
		},
	);

	const unreadCount = data?.count ?? 0;

	// Debug logging
	React.useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			console.log("[CLIENT] useUnreadCount:", {
				userId: currentUserId,
				data,
				unreadCount,
				isLoading,
				error: error?.message,
			});
		}
	}, [currentUserId, data, unreadCount, isLoading, error]);

	return {
		unreadCount,
		isLoading,
		error,
		mutate, // Expose mutate for manual revalidation
	};
};

// Hook for recent notifications
export const useRecentNotifications = ({
	userId,
	limit = 5,
}: {
	userId?: string;
	limit?: number;
}) => {
	const { user } = useAuth();
	const currentUserId = userId || user?.$id;

	const { data, error, isLoading } = useSWR(
		currentUserId
			? `/api/notifications/recent?userId=${currentUserId}&limit=${limit}`
			: null,
		fetcher,
		{
			refreshInterval: 30000, // Refresh every 30 seconds
		},
	);

	const list = Array.isArray(data)
		? data
		: data && typeof data === "object" && "data" in data
			? (data as { data?: Notification[] }).data
			: undefined;

	return {
		recentNotifications: Array.isArray(list) ? list : [],
		isLoading,
		error,
	};
};
