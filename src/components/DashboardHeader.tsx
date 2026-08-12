"use client";

import type { Models } from "appwrite";
import { Bell, LogOut, Mail } from "lucide-react";
import { useCallback, useState } from "react";
import { mutate } from "swr";
import CaalmAssistantLauncher from "@/components/assistant/CaalmAssistantLauncher";
import NotificationBadge from "@/components/NotificationBadge";
import NotificationCenter from "@/components/NotificationCenter";
import ProfilePicture from "@/components/ProfilePicture";
import QuickActions from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";

interface DashboardHeaderProps {
	user?:
		| (Models.User<Models.Preferences> & {
				fullName?: string;
				role?: string;
				department?: string;
		  })
		| null;
}

const DashboardHeader = ({ user: userProp }: DashboardHeaderProps) => {
	const { logout, user: userFromContext } = useAuth();
	const [notifOpen, setNotifOpen] = useState(false);

	// Use user from context if prop is not provided (avoids serialization issues)
	const user = userProp || userFromContext;

	const { unreadCount } = useUnreadCount(user?.$id);
	const { mutate: revalidateNotifications } = useNotifications(user?.$id);

	const fetchUnread = useCallback(async () => {
		await revalidateNotifications();
		if (user?.$id) {
			await mutate(
				`/api/notifications/unread-count?userId=${user.$id}`,
				undefined,
				{ revalidate: true },
			);
		}
	}, [user?.$id, revalidateNotifications]);

	const handleNotificationClose = () => {
		setNotifOpen(false);
		fetchUnread();
	};

	const handleLogout = () => {
		logout("manual");
	};

	return (
		<div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
			<div className="min-w-0 flex-1 overflow-x-auto">
				<QuickActions user={user} />
			</div>
			<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
				<CaalmAssistantLauncher />
				<header className="bg-white/30 backdrop-blur border border-white/40 shadow-lg rounded-full w-full sm:w-fit px-2.5 sm:px-3 shrink-0">
					<div className="flex h-10 items-center">
						{user && (
							<div className="flex items-center gap-1.5">
								<div className="flex shrink-0 items-center justify-center">
									<ProfilePicture user={user} size="sm" />
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => {
										setNotifOpen(true);
										void revalidateNotifications();
									}}
									className="relative h-8 w-8 shrink-0 text-slate-700 hover:bg-white/40"
									data-testid="notification-bell"
									aria-label="Open notifications"
								>
									<Bell
										className={`h-6 w-6 text-[#00C1CB] ${
											unreadCount >= 1 ? "notification-bell-shake" : ""
										}`}
									/>
									<NotificationBadge
										count={unreadCount}
										size="sm"
										className="absolute -top-0.5 -right-0.5"
									/>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0 text-slate-700 hover:bg-white/40"
									aria-label="Messages"
								>
									<Mail className="h-6 w-6" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleLogout}
									className="h-8 w-8 shrink-0 text-slate-700 hover:bg-white/40"
									aria-label="Log out"
								>
									<LogOut className="h-6 w-6" />
								</Button>
							</div>
						)}
					</div>
					<NotificationCenter
						open={notifOpen}
						onClose={handleNotificationClose}
						onRefresh={fetchUnread}
						userId={user?.$id}
					/>
				</header>
			</div>
		</div>
	);
};

export default DashboardHeader;
