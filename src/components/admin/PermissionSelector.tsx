'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Permission {
  $id: string;
  key: string;
  name: string;
  category: string;
  description?: string;
}

interface PermissionSelectorProps {
  permissions: Permission[];
  selectedPermissions: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  disabled?: boolean;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  permissions,
  selectedPermissions,
  onSelectionChange,
  disabled = false,
}) => {
  const permissionsByCategory = permissions.reduce(
    (acc: Record<string, Permission[]>, perm) => {
      const category = perm.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {}
  );

  const handleToggle = (permissionKey: string) => {
    if (disabled) return;

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionKey)) {
      newSelected.delete(permissionKey);
    } else {
      newSelected.add(permissionKey);
    }
    onSelectionChange(newSelected);
  };

  const handleCategoryToggle = (category: string, select: boolean) => {
    if (disabled) return;

    const newSelected = new Set(selectedPermissions);
    const categoryPermissions = permissionsByCategory[category] || [];

    categoryPermissions.forEach((perm) => {
      if (select) {
        newSelected.add(perm.key);
      } else {
        newSelected.delete(perm.key);
      }
    });

    onSelectionChange(newSelected);
  };

  const isCategorySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    return (
      categoryPermissions.length > 0 &&
      categoryPermissions.every((perm) => selectedPermissions.has(perm.key))
    );
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    const selectedCount = categoryPermissions.filter((perm) =>
      selectedPermissions.has(perm.key)
    ).length;
    return selectedCount > 0 && selectedCount < categoryPermissions.length;
  };

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {Object.entries(permissionsByCategory).map(([category, perms]) => {
          const allSelected = isCategorySelected(category);
          const partiallySelected = isCategoryPartiallySelected(category);

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">
                    {category.replace('_', ' ')}
                  </CardTitle>
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = partiallySelected;
                      }
                    }}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category, checked === true)
                    }
                    disabled={disabled}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {perms.map((perm) => (
                  <div
                    key={perm.$id}
                    className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={perm.$id}
                      checked={selectedPermissions.has(perm.key)}
                      onCheckedChange={() => handleToggle(perm.key)}
                      disabled={disabled}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={perm.$id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {perm.name}
                      </Label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {perm.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default PermissionSelector;

