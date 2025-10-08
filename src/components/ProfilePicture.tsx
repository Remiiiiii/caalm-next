'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, Upload, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Models } from 'appwrite';
import { cn } from '@/lib/utils';

interface ProfilePictureProps {
  user: Models.User<Models.Preferences> | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  editable?: boolean;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  user,
  size = 'md',
  className,
  editable = true,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(
    (user?.prefs as any)?.profileImage || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Generate initials from user name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color based on user ID
  const getAvatarColor = (userId: string) => {
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
    
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-sm',
      icon: 'w-4 h-4',
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      icon: 'w-5 h-5',
    },
  };

  const config = sizeConfig[size];

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.$id);
      formData.append('type', 'profile-picture');

      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const result = await response.json();
      setProfileImageUrl(result.imageUrl);

      toast({
        title: 'Profile picture updated',
        description: 'Your profile picture has been updated successfully.',
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePicture = async () => {
    if (!user) return;

    setIsUploading(true);

    try {
      const response = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.$id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile picture');
      }

      setProfileImageUrl(null);

      toast({
        title: 'Profile picture removed',
        description: 'Your profile picture has been removed successfully.',
      });
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to remove profile picture. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div
        className={cn(
          'rounded-full bg-gray-200 flex items-center justify-center',
          config.container,
          className
        )}
      >
        <span className={cn('text-gray-500 font-medium', config.text)}>?</span>
      </div>
    );
  }

  const initials = getInitials(user.name || '');
  const avatarColor = getAvatarColor(user.$id);

  const avatarContent = (
    <Avatar className={cn(config.container, className)}>
      {profileImageUrl ? (
        <AvatarImage src={profileImageUrl} alt={user.name || 'Profile'} />
      ) : null}
      <AvatarFallback
        style={{ backgroundColor: avatarColor }}
        className={cn('text-white font-medium', config.text)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!editable) {
    return avatarContent;
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative p-0 rounded-full hover:opacity-80 transition-opacity"
            disabled={isUploading}
          >
            {avatarContent}
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className={cn('text-white', config.icon)} />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleFileSelect} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            {profileImageUrl ? 'Change picture' : 'Upload picture'}
          </DropdownMenuItem>
          {profileImageUrl && (
            <DropdownMenuItem
              onClick={handleDeletePicture}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove picture
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
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