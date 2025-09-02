'use client';

import React, { useState } from 'react';
import {
  MoreHorizontal,
  Download,
  Share2,
  Trash2,
  Archive,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UIFileDoc } from '@/types/files';

interface ActionDropdownProps {
  file: UIFileDoc;
  showAllActions?: boolean;
  userRole?: string;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  file,
  showAllActions = true,
  userRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Role-based action filtering
  const getFilteredActions = () => {
    const allActions = [
      {
        key: 'download',
        label: 'Download',
        icon: Download,
        action: () => handleDownload(),
      },
      {
        key: 'share',
        label: 'Share',
        icon: Share2,
        action: () => handleShare(),
      },
      {
        key: 'assign',
        label: 'Assign',
        icon: UserPlus,
        action: () => handleAssign(),
      },
      {
        key: 'archive',
        label: 'Archive',
        icon: Archive,
        action: () => handleArchive(),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        action: () => handleDelete(),
      },
    ];

    // For managers, restrict actions to specific ones
    if (userRole === 'manager' && !showAllActions) {
      const managerActions = ['download', 'share', 'assign'];
      return allActions.filter((action) => managerActions.includes(action.key));
    }

    return allActions;
  };

  const handleDownload = () => {
    // Handle file download
    console.log('Downloading file:', file.name);
    // TODO: Implement actual download logic
  };

  const handleShare = () => {
    // Handle file sharing
    console.log('Sharing file:', file.name);
    // TODO: Implement actual share logic
  };

  const handleAssign = () => {
    // Handle file assignment
    console.log('Assigning file:', file.name);
    // TODO: Implement actual assignment logic
  };

  const handleArchive = () => {
    // Handle file archiving
    console.log('Archiving file:', file.name);
    // TODO: Implement actual archive logic
  };

  const handleDelete = () => {
    // Handle file deletion
    console.log('Deleting file:', file.name);
    // TODO: Implement actual delete logic
  };

  const actions = getFilteredActions();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                action.action();
                setIsOpen(false);
              }}
              className="cursor-pointer"
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
            {index < actions.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionDropdown;
