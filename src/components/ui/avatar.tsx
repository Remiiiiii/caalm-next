import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  userId,
  size = 'md',
  className,
  showName = false,
}) => {
  // Generate initials from full name
  const initials = name
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

    // #ACDDDE', // blue-600
    // '#B7F4CD', // green-600
    // '#EBD2FC', // purple-600
    // '#F1C9C1', // pink-600
    // '#DAD5F4', // indigo-600
    // '#FAEFA7', // yellow-600
    // '#FD7E89', // red-600
    // '#E4F8F0', // teal-600
    // '#FED2AB
  ];
  // Generate a more diverse color index using multiple characters from userId
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  const colorIndex = hash % colors.length;
  const avatarColor = colors[colorIndex];

  // Debug logging
  console.log('Avatar Debug:', {
    userId,
    colorIndex,
    avatarColor,
    hash,
    firstChar: userId.charCodeAt(0),
  });

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

export default Avatar;
