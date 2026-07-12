"use client";

import type { Models } from "appwrite";
import { Bell, LogOut, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { mutate } from "swr";
import NotificationBadge from "@/components/NotificationBadge";
import NotificationCenter from "@/components/NotificationCenter";
import ProfilePicture from "@/components/ProfilePicture";
import QuickActions from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";

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
	const _router = useRouter();
	const { logout, user: userFromContext } = useAuth();
	const [notifOpen, setNotifOpen] = useState(false);

	// Use user from context if prop is not provided (avoids serialization issues)
	const user = userProp || userFromContext;

	// Use SWR hook for instant updates
	const { unreadCount } = useUnreadCount(user?.$id);

	const fetchUnread = useCallback(async () => {
		// Force revalidation of unread count
		if (user?.$id) {
			await mutate(`/api/notifications/unread-count?userId=${user.$id}`);
		}
	}, [user]);

	// Refresh count when notification center is closed
	const handleNotificationClose = () => {
		setNotifOpen(false);
		fetchUnread(); // Refresh count after any actions
	};

	const handleLogout = () => {
		// Use AuthContext logout for instant response
		logout("manual");
	};

	return (
		<div className="flex gap-2 sm:gap-4 items-center min-w-0">
			<QuickActions user={user} />
			<header className="bg-white/30 backdrop-blur border border-white/40 shadow-lg mt-6 md:px-9 sm:mr-7 rounded-full mb-6 ml-auto w-fit px-4 flex-shrink-0">
				<div className="flex items-center h-10">
					{/* Action buttons */}
					{user && (
						<div className="flex items-center space-x-2">
							<ProfilePicture user={user} size="sm" />
							<Button
								variant="ghost"
								onClick={() => setNotifOpen(true)}
								className="relative hover:bg-white/40 text-slate-700"
								data-testid="notification-bell"
								aria-label="Open notifications"
							>
								<Bell className="w-6 h-6" />
								<NotificationBadge
									count={unreadCount}
									size="sm"
									className="absolute -top-1 -right-1"
								/>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="hover:bg-white/40 text-slate-700"
							>
								<Mail className="h-5 w-5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleLogout}
								className="hover:bg-white/40 text-slate-700"
							>
								<LogOut className="h-5 w-5" />
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
	);
};

export default DashboardHeader;
