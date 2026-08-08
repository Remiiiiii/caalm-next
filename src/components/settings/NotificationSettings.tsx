"use client";

import { Bell, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
	disableDesktopAlerts,
	enableDesktopAlerts,
} from "@/lib/push/notifications-client";

const NotificationSettings = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [notifications, setNotifications] = useState({
		emailNotifications: false,
		desktopAlerts: false,
		weeklyReports: false,
	});
	const { toast } = useToast();
	const { user } = useAuth();

	useEffect(() => {
		const load = async () => {
			if (!user?.$id) return;
			try {
				const res = await fetch(
					`/api/notification-settings?userId=${user.$id}`,
				);
				const { data } = await res.json();
				if (data) {
					setNotifications((prev) => ({
						...prev,
						emailNotifications: !!data.email_enabled,
						desktopAlerts: !!data.desktop_alerts_enabled,
						weeklyReports: data.frequency === "weekly",
					}));
				}
			} catch {
				// ignore load errors; defaults stay off
			}
		};
		load();
	}, [user?.$id]);

	const handleDesktopAlertsToggle = async (checked: boolean) => {
		if (checked) {
			const result = await enableDesktopAlerts();
			if (!result.ok) {
				toast({
					title: "Desktop alerts unavailable",
					description: result.message || "Could not enable desktop alerts.",
					variant: "destructive",
				});
				return;
			}
			setNotifications((prev) => ({ ...prev, desktopAlerts: true }));
			toast({
				title: "Desktop alerts enabled",
				description:
					"CAALM can send browser notifications when the tab is closed.",
			});
			return;
		}

		await disableDesktopAlerts();
		setNotifications((prev) => ({ ...prev, desktopAlerts: false }));
		toast({
			title: "Desktop alerts disabled",
			description: "You will no longer receive desktop push notifications.",
		});
	};

	const handleSave = async () => {
		try {
			setIsLoading(true);
			await fetch("/api/notification-settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: user?.$id,
					emailEnabled: notifications.emailNotifications,
					desktopAlertsEnabled: notifications.desktopAlerts,
					frequency: notifications.weeklyReports ? "weekly" : "instant",
				}),
			});

			toast({
				title: "Settings Saved",
				description: "Your notification preferences have been updated.",
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to save notification settings. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Bell className="h-5 w-5 text-blue-500" />
				<span className="text-sm font-medium text-navy">
					Notification Preferences
				</span>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-sm text-light-200">
							Email Notifications
						</Label>
						<p className="text-xs text-light-200">
							Receive notifications via email
						</p>
					</div>
					<Switch
						checked={notifications.emailNotifications}
						onCheckedChange={(checked) =>
							setNotifications((prev) => ({
								...prev,
								emailNotifications: checked,
							}))
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-sm text-light-200">Desktop alerts</Label>
						<p className="text-xs text-light-200">
							Native browser notifications even when the CAALM tab is closed
						</p>
					</div>
					<Switch
						checked={notifications.desktopAlerts}
						onCheckedChange={(checked) => {
							void handleDesktopAlertsToggle(checked);
						}}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-sm text-light-200">Weekly Reports</Label>
						<p className="text-xs text-light-200">
							Receive weekly summary reports
						</p>
					</div>
					<Switch
						checked={notifications.weeklyReports}
						onCheckedChange={(checked) =>
							setNotifications((prev) => ({
								...prev,
								weeklyReports: checked,
							}))
						}
					/>
				</div>
			</div>

			<Button
				onClick={handleSave}
				disabled={isLoading}
				className="w-full bg-blue-500 hover:bg-blue-600"
			>
				<Save className="h-4 w-4" />
				{isLoading ? "Saving..." : "Save Preferences"}
			</Button>
		</div>
	);
};

export default NotificationSettings;
