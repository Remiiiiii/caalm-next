"use client";

import { useNotificationSound } from "@/hooks/useNotificationSound";

export default function NotificationSoundListener() {
	useNotificationSound();
	return null;
}
