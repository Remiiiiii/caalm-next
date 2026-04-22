"use client";

import type { Models } from "appwrite";
import { Bell, FileText, LogOut, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { mutate } from "swr";
import NotificationBadge from "@/components/NotificationBadge";
import NotificationCenter from "@/components/NotificationCenter";
import { UserRoleDisplay } from "@/components/UserRoleDisplay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";
import { signOutUser } from "@/lib/actions/user.actions";

interface DashboardHeaderProps {
	user?: Models.User<Models.Preferences> | null;
}

const DashboardHeader = ({ user: userProp }: DashboardHeaderProps) => {
	const router = useRouter();
	const { user: authUser } = useAuth();
	const user = userProp || authUser;
	const [notifOpen, setNotifOpen] = useState(false);

	// Use SWR hook for unread count (handles both $id and accountId)
	const { unreadCount } = useUnreadCount(user?.$id);

	const fetchUnread = useCallback(async () => {
		// Force revalidation of unread count
		if (user?.$id) {
			await mutate(`/api/notifications/unread-count?userId=${user.$id}`);
		}
	}, [user]);

	const handleLogout = async () => {
		try {
			await signOutUser();
			router.push("/sign-in");
		} catch (error) {
			console.error("Logout failed:", error);
			// Fallback: redirect anyway
			router.push("/sign-in");
		}
	};

	return (
		<header className="bg-background shadow-drop-1 border-b border-border">
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center">
						<FileText className="h-8 w-8 text-coral" />
						<span className="ml-2 text-2xl font-bold text-navy font-poppins">
							CAALM Solutions
						</span>
					</div>

					<div className="flex items-center space-x-4">
						{user ? (
							<>
								<div className="text-sm text-foreground">
									<p className="font-medium text-navy">{user.name}</p>
									<p className="text-xs text-slate-dark">
										<UserRoleDisplay userId={user.$id} /> -{" "}
										{user.prefs?.division || "Unknown Division"}
									</p>
								</div>

								<Button
									variant="ghost"
									onClick={() => setNotifOpen(true)}
									className="relative"
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
									className="hover:bg-coral/10"
								>
									<Mail className="h-5 w-5 text-slate-dark" />
								</Button>

								<Button
									variant="ghost"
									size="icon"
									onClick={handleLogout}
									className="hover:bg-coral/10"
								>
									<LogOut className="h-5 w-5 text-slate-dark" />
								</Button>
							</>
						) : (
							// Guest/loading state
							<div className="text-sm text-foreground">
								<p className="font-medium text-navy">Welcome</p>
								<p className="text-xs text-slate-dark">Loading...</p>
							</div>
						)}
					</div>
				</div>
			</div>
			<NotificationCenter
				open={notifOpen}
				onClose={() => {
					setNotifOpen(false);
					fetchUnread(); // Refresh count after any actions
				}}
				onRefresh={fetchUnread}
				userId={user?.$id}
			/>
		</header>
	);
};

export default DashboardHeader;
