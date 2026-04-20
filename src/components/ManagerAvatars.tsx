"use client";

import type React from "react";
import { getAvatarColor } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppUser } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";

interface ManagerAvatarsProps {
	managers: AppUser[];
	profileImages: Record<string, string>;
	failedImages: Set<string>;
	onImageError: (userId: string, accountId?: string) => void;
}

const ManagerAvatars: React.FC<ManagerAvatarsProps> = ({
	managers,
	profileImages,
	failedImages,
	onImageError,
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
		<div
			className="flex items-center"
			role="list"
			aria-label="Assigned managers"
		>
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

				// Get profile image URL if available
				const profileImageUrl =
					profileImages[manager.$id] ||
					(manager.accountId ? profileImages[manager.accountId] : null);

				// Check if this image failed to load
				const imageFailed =
					failedImages.has(manager.$id) ||
					(manager.accountId && failedImages.has(manager.accountId));

				const shouldShowImage = profileImageUrl && !imageFailed;

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
									aria-label={`View ${manager.fullName}'s profile`}
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											// Tooltip will show on focus/hover, no additional action needed
										}
									}}
								>
									{shouldShowImage ? (
										<div
											className="rounded-full overflow-hidden"
											style={{
												background:
													"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
												padding: "2px",
												width: "24px",
												height: "24px",
											}}
										>
											<img
												src={profileImageUrl}
												alt={manager.fullName}
												className="w-full h-full object-cover rounded-full border border-[#FCFEFF]"
												onError={() => {
													onImageError(manager.$id, manager.accountId);
												}}
											/>
										</div>
									) : (
										<div
											className="rounded-full w-6 h-6 flex items-center justify-center text-white font-medium text-xs border-2 border-white shadow-sm"
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
								className="rounded-full w-6 h-6 flex items-center justify-center text-white font-medium text-xs bg-purple-400 border-2 border-white -ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm"
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
