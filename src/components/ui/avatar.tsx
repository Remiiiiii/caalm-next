"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

// Legacy Avatar component for backward compatibility
interface LegacyAvatarProps {
  name?: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
}

const LegacyAvatar: React.FC<LegacyAvatarProps> = ({
  name,
  userId,
  size = 'md',
  className,
  showName = false,
}) => {
  // Generate initials from full name, handle undefined/null names
  const initials =
    name && typeof name === 'string'
      ? name
          .split(' ')
          .map((name) => name.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U'; // Default to 'U' for User if name is undefined

  // Generate a consistent color based on user ID
  const colors = [
    '#2563eb', // blue-600
    '#16a34a', // green-600
    '#9333ea', // purple-600
    '#db2777', // pink-600
    '#4f46e5', // indigo-600
    '#ca8a04', // yellow-600
    '#dc2626', // red-600
    '#0d9488', // teal-600
    '#ea580c', // orange-600
  ];
  // Generate a more diverse color index using multiple characters from userId
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  const colorIndex = hash % colors.length;
  const avatarColor = colors[colorIndex];

  // Size classes
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center text-white font-medium',
          sizeClasses[size]
        )}
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      {showName && <span className="text-sm text-slate-700">{name}</span>}
    </div>
  );
};

export default LegacyAvatar;
