"use client";

import { useEffect, useRef } from "react";
import { mutate } from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/sounds/notificationSound";
import type { Notification } from "@/types/notifications";

const POLL_INTERVAL_MS = 5000;

function parseNotificationsResponse(data: unknown): Notification[] {
	if (Array.isArray(data)) return data;
	if (data && typeof data === "object") {
		const record = data as { data?: Notification[]; rows?: Notification[] };
		if (Array.isArray(record.data)) return record.data;
		if (Array.isArray(record.rows)) return record.rows;
	}
	return [];
}

function getNotificationId(notification: {
	$id?: string;
	id?: string;
}): string {
	return notification.$id || notification.id || "";
}

export function useNotificationSound(userId?: string) {
	const { user } = useAuth();
	const currentUserId = userId || user?.$id;
	const seenIdsRef = useRef<Set<string> | null>(null);
	const seededRef = useRef(false);

	useEffect(() => {
		if (!currentUserId || typeof window === "undefined") return;

		const registerNotification = (id: string) => {
			if (!id) return;

			if (!seededRef.current) return;

			if (!seenIdsRef.current) {
				seenIdsRef.current = new Set();
			}

			if (seenIdsRef.current.has(id)) return;

			seenIdsRef.current.add(id);
			playNotificationSound();
		};

		const seedNotifications = (list: Notification[]) => {
			seenIdsRef.current = new Set(list.map((n) => n.$id));
			seededRef.current = true;
		};

		const syncNotifications = (list: Notification[]) => {
			if (!seededRef.current) {
				seedNotifications(list);
				return;
			}

			let hasNew = false;
			for (const notification of list) {
				const id = notification.$id;
				if (!id || seenIdsRef.current?.has(id)) continue;
				hasNew = true;
				registerNotification(id);
			}

			if (hasNew && currentUserId) {
				void mutate(`/api/notifications?userId=${currentUserId}`, undefined, {
					revalidate: true,
				});
				void mutate(
					`/api/notifications/unread-count?userId=${currentUserId}`,
					undefined,
					{ revalidate: true },
				);
			}
		};

		let cancelled = false;

		const pollNotifications = async () => {
			try {
				const response = await fetch(
					`/api/notifications?userId=${currentUserId}`,
					{ cache: "no-store" },
				);
				if (!response.ok || cancelled) return;

				const data = await response.json();
				syncNotifications(parseNotificationsResponse(data));
			} catch {
				// Non-critical; SSE or next poll will retry
			}
		};

		void pollNotifications();
		const pollTimer = window.setInterval(pollNotifications, POLL_INTERVAL_MS);

		const eventSource = new EventSource("/api/notifications/sse");

		eventSource.addEventListener("notification", (event) => {
			try {
				const data = JSON.parse(event.data) as Notification & { id?: string };
				const id = getNotificationId(data);
				registerNotification(id);
				void mutate(`/api/notifications?userId=${currentUserId}`);
				void mutate(`/api/notifications/unread-count?userId=${currentUserId}`);
			} catch {
				// Ignore malformed SSE payloads
			}
		});

		return () => {
			cancelled = true;
			window.clearInterval(pollTimer);
			eventSource.close();
		};
	}, [currentUserId]);
}
