import type React from "react";
import { cn } from "@/lib/utils";

// Export color generation logic so it can be shared
export const AVATAR_COLORS = [
	"#2563eb", // blue-600
	"#16a34a", // green-600
	"#9333ea", // purple-600
	"#db2777", // pink-600
	"#4f46e5", // indigo-600
	"#ca8a04", // yellow-600
	"#dc2626", // red-600
	"#0d9488", // teal-600
	"#ea580c", // orange-600
];

/**
 * Generate avatar color for a given user ID
 * This is the single source of truth for avatar colors across the app
 * Uses the same logic as ProfilePicture/Avatar component
 */
export const getAvatarColor = (userId: string): string => {
	// Generate a more diverse color index using multiple characters from userId
	const hash = userId.split("").reduce((acc, char) => {
		return acc + char.charCodeAt(0);
	}, 0);
	const colorIndex = hash % AVATAR_COLORS.length;
	return AVATAR_COLORS[colorIndex];
};

interface AvatarProps {
	name?: string;
	userId: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	showName?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
	name,
	userId,
	size = "md",
	className,
	showName = false,
}) => {
	// Generate initials from full name, handle undefined/null names
	const initials =
		name && typeof name === "string"
			? name
					.split(" ")
					.map((name) => name.charAt(0))
					.join("")
					.toUpperCase()
					.slice(0, 2)
			: "U"; // Default to 'U' for User if name is undefined

	// Use the shared color generation function
	const avatarColor = getAvatarColor(userId);

	// Size classes
	const sizeClasses = {
		sm: "w-6 h-6 text-xs",
		md: "w-8 h-8 text-sm",
		lg: "w-12 h-12 text-lg",
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div
				className={cn(
					"rounded-full flex items-center justify-center text-white font-medium",
					sizeClasses[size],
				)}
				style={{ backgroundColor: avatarColor }}
			>
				{initials}
			</div>
			{showName && <span className="text-sm text-slate-700">{name}</span>}
		</div>
	);
};

export default Avatar;
