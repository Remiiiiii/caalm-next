"use client";

import type { Models } from "node-appwrite";
import type { ReactNode } from "react";
import ProfilePicture from "@/components/ProfilePicture";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export type DashboardGreetingUser = Models.User<Models.Preferences> & {
	fullName?: string;
	name?: string;
	avatar?: string | null;
	profileImageId?: string | null;
	division?: string | null;
	department?: string | null;
	departmentLabel?: string | null;
};

interface DashboardGreetingProps {
	user?: DashboardGreetingUser | null;
	/** Optional right-side actions (last updated, CTAs, etc.) */
	actions?: ReactNode;
	className?: string;
}

function getTimeBasedGreeting(): string {
	const hours = new Date().getHours();
	if (hours < 12) return "Good morning";
	if (hours < 18) return "Good afternoon";
	return "Good evening";
}

function resolveBadgeLabel(
	user: DashboardGreetingUser | null | undefined,
): string {
	const raw =
		user?.division || user?.departmentLabel || user?.department || "unknown";
	return String(raw).replace(/-/g, " ").toUpperCase();
}

function resolveDisplayName(
	user: DashboardGreetingUser | null | undefined,
): string {
	return user?.fullName || user?.name || "";
}

/**
 * Shared dashboard greeting: avatar + time greeting + name + division/department badge.
 */
export function DashboardGreeting({
	user: userProp,
	actions,
	className,
}: DashboardGreetingProps) {
	const { user: authUser } = useAuth();
	const authTyped = authUser as DashboardGreetingUser | null;

	// Merge server profile fields with auth prefs so the photo stays connected
	const profileUser: DashboardGreetingUser | null =
		userProp || authTyped
			? ({
					...(authTyped || {}),
					...(userProp || {}),
					name:
						userProp?.name ||
						userProp?.fullName ||
						authTyped?.name ||
						authTyped?.fullName ||
						"",
					fullName:
						userProp?.fullName ||
						userProp?.name ||
						authTyped?.fullName ||
						authTyped?.name,
					avatar: userProp?.avatar ?? authTyped?.avatar ?? null,
					profileImageId:
						userProp?.profileImageId ?? authTyped?.profileImageId ?? null,
					prefs: {
						...(authTyped?.prefs || {}),
						...(userProp?.prefs || {}),
					},
				} as DashboardGreetingUser)
			: null;

	const greeting = getTimeBasedGreeting();
	const displayName = resolveDisplayName(profileUser);
	const badgeLabel = resolveBadgeLabel(profileUser);

	const pictureUser = profileUser
		? (profileUser as Models.User<Models.Preferences>)
		: null;

	return (
		<div
			className={cn(
				"mb-6 flex flex-wrap items-center justify-between gap-4",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				{pictureUser ? (
					<ProfilePicture
						user={pictureUser}
						size="lg"
						editable={false}
						className="shrink-0"
					/>
				) : (
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0f5384] text-sm font-semibold text-white">
						?
					</div>
				)}
				<div className="min-w-0">
					<p className="text-xs text-slate-500">{greeting}</p>
					<div className="mt-0.5 flex flex-wrap items-center gap-2">
						<h1 className="truncate text-xl font-semibold tracking-tight text-slate-700 sm:text-2xl">
							{displayName || "Welcome"}
						</h1>
						<span
							className={cn(
								"inline-flex items-center rounded-md border px-2 py-0.5",
								"text-[10px] font-semibold tracking-wide",
								"border-green/20 bg-green/10 text-green",
							)}
						>
							{badgeLabel}
						</span>
					</div>
				</div>
			</div>

			{actions ? (
				<div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div>
			) : null}
		</div>
	);
}
