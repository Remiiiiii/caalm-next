"use client";

import type { Models } from "appwrite";
import { Camera, Trash2, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	DropdownMenu,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn, getProfilePictureUrl } from "@/lib/utils";

interface ProfilePictureProps {
	user: Models.User<Models.Preferences> | null;
	size?: "sm" | "md" | "lg";
	className?: string;
	editable?: boolean;
}

type ProfileImageUser = Models.User<Models.Preferences> & {
	avatar?: string | null;
	profileImageId?: string | null;
	fullName?: string;
};

/** Resolve a displayable image URL from prefs, avatar URL, or storage file id. */
function resolveProfileImageUrl(
	user: ProfileImageUser | null | undefined,
): string | null {
	if (!user) return null;

	const prefs = user.prefs as
		| (Models.Preferences & {
				profileImage?: string | null;
				profileImageId?: string | null;
		  })
		| undefined;

	const prefUrl = prefs?.profileImage?.trim();
	if (prefUrl) return prefUrl;

	const avatarValue = user.avatar?.trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) return avatarValue;
	if (avatarValue?.startsWith("/")) return avatarValue;

	const fileId =
		(avatarValue &&
		!avatarValue.startsWith("/") &&
		!/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: null) ||
		user.profileImageId?.trim() ||
		prefs?.profileImageId?.trim() ||
		null;

	return getProfilePictureUrl(fileId);
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
	user,
	size = "md",
	className,
	editable = true,
}) => {
	const [isUploading, setIsUploading] = useState(false);
	const [profileImageUrl, setProfileImageUrl] = useState<string | null>(() =>
		resolveProfileImageUrl(user as ProfileImageUser | null),
	);
	const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToast();
	const { refreshUser } = useAuth();

	// Size configurations
	const sizeConfig = {
		sm: {
			container: "w-8 h-8",
			text: "text-xs",
			icon: "w-3 h-3",
		},
		md: {
			container: "w-10 h-10",
			text: "text-sm",
			icon: "w-4 h-4",
		},
		lg: {
			container: "w-12 h-12",
			text: "text-base",
			icon: "w-5 h-5",
		},
	};

	const config = sizeConfig[size];

	// Keep local URL in sync with user record (prefs URL, avatar file id, etc.)
	useEffect(() => {
		const imageUrl = resolveProfileImageUrl(user as ProfileImageUser | null);

		if (imageUrl) {
			setProfileImageUrl(imageUrl);
			if (uploadedImageUrl && uploadedImageUrl === imageUrl) {
				setUploadedImageUrl(null);
			}
		} else {
			setProfileImageUrl(uploadedImageUrl || null);
		}
	}, [user, uploadedImageUrl]);

	const handleFileSelect = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file || !user) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file type",
				description: "Please select an image file.",
				variant: "destructive",
			});
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "Please select an image smaller than 5MB.",
				variant: "destructive",
			});
			return;
		}

		setIsUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("userId", user.$id);
			formData.append("type", "profile-picture");

			const response = await fetch("/api/user/profile-picture", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				let errorMessage = `Upload failed with status ${response.status}`;

				try {
					// Clone the response to avoid "body stream already read" error
					const responseClone = response.clone();
					const errorData = await responseClone.json();
					errorMessage = errorData.error || errorMessage;
				} catch (_parseError) {
					// If response is not JSON, try to get text from original response
					try {
						const errorText = await response.text();
						errorMessage = errorText || errorMessage;
					} catch (textError) {
						console.error("Failed to parse error response:", textError);
					}
				}

				throw new Error(errorMessage);
			}

			const result = await response.json();

			// Set the uploaded image URL immediately from the API response
			setUploadedImageUrl(result.imageUrl);
			setProfileImageUrl(result.imageUrl);

			// Refresh user data to sync with backend
			// Add a small delay to ensure database update is propagated
			await new Promise((resolve) => setTimeout(resolve, 200));
			await refreshUser();

			toast({
				title: "Profile picture updated",
				description: "Your profile picture has been updated successfully.",
			});
		} catch (error) {
			console.error("Upload failed:", error);
			toast({
				title: "Upload failed",
				description: "Failed to upload profile picture. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleDeletePicture = async () => {
		if (!user) return;

		setIsUploading(true);

		try {
			const response = await fetch("/api/user/profile-picture", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId: user.$id }),
			});

			if (!response.ok) {
				throw new Error("Failed to delete profile picture");
			}

			setUploadedImageUrl(null);
			setProfileImageUrl(null);

			// Refresh user data to clear the profile image
			await new Promise((resolve) => setTimeout(resolve, 200));
			await refreshUser();

			toast({
				title: "Profile picture removed",
				description: "Your profile picture has been removed successfully.",
			});
		} catch (error) {
			console.error("Delete failed:", error);
			toast({
				title: "Delete failed",
				description: "Failed to remove profile picture. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	if (!user) {
		return (
			<div
				className={cn(
					"rounded-full bg-gray-200 flex items-center justify-center",
					config.container,
					className,
				)}
			>
				<span className={cn("text-gray-500 font-medium", config.text)}>?</span>
			</div>
		);
	}

	const sizePx = { sm: 32, md: 40, lg: 48 } as const;

	const avatarContent = profileImageUrl ? (
		<div
			className={cn(
				"rounded-full overflow-hidden relative shrink-0",
				config.container,
				className,
			)}
			style={{
				background: "linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
				padding: "3px",
				width: sizePx[size],
				height: sizePx[size],
			}}
		>
			<img
				src={profileImageUrl}
				alt={
					(user as ProfileImageUser).fullName || user.name || "Profile"
				}
				className="h-full w-full rounded-full border-2 border-[#FCFEFF] object-cover"
				onError={(e: any) => {
					console.error("ProfilePicture: Image failed to load:", {
						src: profileImageUrl,
						errorType: e.type,
						target: e.target,
						currentSrc: e.target?.currentSrc,
						naturalWidth: e.target?.naturalWidth,
						naturalHeight: e.target?.naturalHeight,
					});
					console.error("Full error event:", e);
					// Fallback to showing avatar if image fails
					setProfileImageUrl(null);
				}}
			/>
		</div>
	) : (
		<Avatar
			name={user.name || ""}
			userId={user.$id}
			size={size}
			className={className}
		/>
	);

	if (!editable) {
		return avatarContent;
	}

	return (
		<div className="relative">
			<DropdownMenu>
				<AppDropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="relative p-0 rounded-full hover:opacity-80 transition-opacity"
						disabled={isUploading}
					>
						{avatarContent}
						<div className="absolute inset-0 rounded-full bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
							<Camera className={cn("text-white", config.icon)} />
						</div>
					</Button>
				</AppDropdownMenuTrigger>
				<AppDropdownMenuContent align="end" className="w-48">
					<AppDropdownMenuItem
						icon={Upload}
						onClick={handleFileSelect}
						disabled={isUploading}
					>
						{profileImageUrl ? "Change picture" : "Upload picture"}
					</AppDropdownMenuItem>
					{profileImageUrl && (
						<AppDropdownMenuItem
							icon={Trash2}
							tone="danger"
							onClick={handleDeletePicture}
							disabled={isUploading}
						>
							Remove picture
						</AppDropdownMenuItem>
					)}
				</AppDropdownMenuContent>
			</DropdownMenu>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileChange}
				className="hidden"
			/>
		</div>
	);
};

export default ProfilePicture;
