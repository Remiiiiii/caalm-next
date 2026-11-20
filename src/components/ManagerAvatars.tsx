"use client";

import type React from "react";
import {
	AVATAR_PHOTO_INNER_BORDER,
	AVATAR_PHOTO_RING_GRADIENT,
	AVATAR_PHOTO_RING_PAD,
	getAvatarColor,
} from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppUser } from "@/lib/actions/user.actions";
import { cn, getProfilePictureUrl } from "@/lib/utils";

interface ManagerAvatarsProps {
	managers: AppUser[];
	profileImages: Record<string, string>;
	failedImages: Set<string>;
	onImageError: (userId: string, accountId?: string) => void;
	/** Accessible name for the avatar group (default: assigned managers). */
	ariaLabel?: string;
}

/** Prefer an uploaded photo URL; otherwise fall back to storage file id. */
function resolveManagerImageUrl(
	manager: AppUser,
	profileImages: Record<string, string>,
): string | null {
	const fromMap =
		profileImages[manager.$id] ||
		(manager.accountId ? profileImages[manager.accountId] : undefined);
	if (fromMap) return fromMap;

	const avatarValue = manager.avatar?.trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) return avatarValue;
	if (avatarValue?.startsWith("/")) return avatarValue;

	const fileId =
		(avatarValue &&
		!avatarValue.startsWith("/") &&
		!/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: null) ||
		manager.profileImageId?.trim() ||
		null;

	return getProfilePictureUrl(fileId);
}

const ManagerAvatars: React.FC<ManagerAvatarsProps> = ({
	managers,
	profileImages,
	failedImages,
	onImageError,
	ariaLabel = "Assigned managers",
}) => {
	if (managers.length === 0) {
		return null;
	}

	// Display avatars
	// Show first 4 if more than 5 total, otherwise show all
	const maxDisplay = managers.length > 5 ? 4 : managers.length;
	const remainingCount = managers.length > 5 ? managers.length - 4 : 0;
	const displayManagers = managers.slice(0, maxDisplay);

	return (
		<div className="flex items-center" role="list" aria-label={ariaLabel}>
			{displayManagers.map((manager, index) => {
				const initials = manager.fullName
					? manager.fullName
							.split(" ")
							.map((n) => n.charAt(0))
							.join("")
							.toUpperCase()
							.slice(0, 2)
					: "U";

				// Use $id (database document ID) to match ProfilePicture in DashboardHeader
				const userId = manager.$id;
				const avatarColor = getAvatarColor(userId);

				const profileImageUrl = resolveManagerImageUrl(manager, profileImages);

				// Check if this image failed to load
				const imageFailed =
					failedImages.has(manager.$id) ||
					(manager.accountId && failedImages.has(manager.accountId));

				const shouldShowImage = Boolean(profileImageUrl) && !imageFailed;

				return (
					<TooltipProvider key={`${manager.$id || index}`}>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className={cn(
										index > 0 && "-ml-2",
										"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full",
									)}
									aria-label={manager.fullName || "User"}
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
										}
									}}
								>
									{shouldShowImage ? (
										<div
											className="relative shrink-0 overflow-hidden rounded-full"
											style={{
												background: AVATAR_PHOTO_RING_GRADIENT,
												padding: AVATAR_PHOTO_RING_PAD,
												/* md = 32px — Fix next / ASSIGN_SIZE */
												width: "32px",
												height: "32px",
											}}
										>
											<img
												src={profileImageUrl!}
												alt={manager.fullName}
												className={cn(
													"h-full w-full rounded-full object-cover",
													AVATAR_PHOTO_INNER_BORDER,
												)}
												referrerPolicy="no-referrer"
												onError={() => {
													onImageError(manager.$id, manager.accountId);
												}}
											/>
										</div>
									) : (
										<div
											className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs text-white shadow-sm"
											style={{ backgroundColor: avatarColor }}
										>
											{initials}
										</div>
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{manager.fullName}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			})}
			{remainingCount > 0 && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-400 text-xs text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
								aria-label={`${remainingCount} additional assigned managers`}
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
									}
								}}
							>
								+{remainingCount}
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<div className="space-y-1">
								{managers.slice(4).map((manager, index) => (
									<p key={`remaining-${manager.$id || index}`}>
										{manager.fullName}
									</p>
								))}
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
};

export default ManagerAvatars;
