'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // Create or use your own
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/actions/user.actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash, ListFilter, Pencil } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { capitalizeRole } from '@/lib/utils';

// Map user status to badge colors to mirror Executive Dashboard invitations table
const getUserStatusBadgeClasses = (status: string): string => {
  const normalized = status?.toLowerCase?.() ?? '';
  switch (normalized) {
    case 'active':
      return 'bg-[#ccf3e9] text-[#3dd9b3] text-xs rounded';
    case 'inactive':
      return 'bg-[#fff1f1] text-[#fe8787] text-xs rounded';
    case 'pending':
      return 'bg-[#fef6f0] text-[#ebc620] text-xs rounded';
    default:
      return 'bg-gray-100 text-gray-600 text-xs rounded';
  }
};

const UserManagement = () => {
  const [editUser, setEditUser] = useState<
    (AppUser & { $id: string; department?: string }) | null
  >(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    department: '',
    role: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    roles: [] as string[],
    departments: [] as string[],
    statuses: [] as string[],
  });

  // Use the real-time users hook
  const { users, isLoading, error, refresh } = useUsers({
    enableRealTime: true,
    pollingInterval: 15000, // 15 seconds
  });

  // Ensure users have the proper type
  const typedUsers = users as (AppUser & {
    $id: string;
    department?: string;
  })[];

  // Filter and search functionality
  const filteredUsers = useMemo(() => {
    let filtered = typedUsers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (filters.roles.length > 0) {
      filtered = filtered.filter((user) => filters.roles.includes(user.role));
    }

    // Apply department filter
    if (filters.departments.length > 0) {
      filtered = filtered.filter(
        (user) =>
          user.department && filters.departments.includes(user.department)
      );
    }

    // Apply status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter((user) =>
        filters.statuses.includes(user.status as string)
      );
    }

    return filtered;
  }, [typedUsers, searchTerm, filters]);

  // Get unique values for filter options
  const uniqueRoles = useMemo(
    () => [...new Set(typedUsers.map((user) => user.role))].filter(Boolean),
    [typedUsers]
  );

  const uniqueDepartments = useMemo(
    () =>
      [...new Set(typedUsers.map((user) => user.department))].filter(
        Boolean
      ) as string[],
    [typedUsers]
  );

  const uniqueStatuses = useMemo(
    () =>
      [...new Set(typedUsers.map((user) => user.status))].filter(
        Boolean
      ) as string[],
    [typedUsers]
  );

  // Filter handlers
  const handleFilterChange = (
    type: 'roles' | 'departments' | 'statuses',
    value: string,
    checked: boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [type]: checked
        ? [...prev[type], value]
        : prev[type].filter((item) => item !== value),
    }));
  };

  const clearAllFilters = () => {
    setFilters({ roles: [], departments: [], statuses: [] });
    setSearchTerm('');
  };

  const hasActiveFilters =
    searchTerm ||
    filters.roles.length > 0 ||
    filters.departments.length > 0 ||
    filters.statuses.length > 0;

  // User edit handlers
  const closeEditModal = () => {
    setEditUser(null);
    setEditForm({ fullName: '', department: '', role: '' });
    setEditError(null);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    setEditLoading(true);
    setEditError(null);

    try {
      // Here you would typically call an API to update the user
      // For now, we'll just simulate the update
      console.log('Updating user:', editUser.$id, editForm);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      closeEditModal();
      // Refresh users to get the latest data
      refresh();
    } catch (error) {
      console.error('Error updating user:', error);
      setEditError('Failed to update user');
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Here you would typically call an API to delete the user
      console.log('Deleting user:', userId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      // Refresh users to get the latest data
      refresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user.$id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      // Here you would typically call an API to delete multiple users
      console.log('Bulk deleting users');

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Success',
        description: 'Selected users deleted successfully',
      });

      setShowBulkDeleteDialog(false);
      // Refresh users to get the latest data
      refresh();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete selected users',
        variant: 'destructive',
      });
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load users</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg font-bold sidebar-gradient-text">
            <span>User Management</span>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                  >
                    <ListFilter className="h-4 w-4 mr-2" />
                    Filter{' '}
                    {hasActiveFilters &&
                      `(${
                        filters.roles.length +
                        filters.departments.length +
                        filters.statuses.length
                      })`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                  {uniqueRoles.map((role) => (
                    <DropdownMenuCheckboxItem
                      key={role}
                      checked={filters.roles.includes(role)}
                      onCheckedChange={(checked) =>
                        handleFilterChange('roles', role, checked)
                      }
                    >
                      {capitalizeRole(role)}
                    </DropdownMenuCheckboxItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Department</DropdownMenuLabel>
                  {uniqueDepartments.map((dept) => (
                    <DropdownMenuCheckboxItem
                      key={dept}
                      checked={filters.departments.includes(dept)}
                      onCheckedChange={(checked) =>
                        handleFilterChange('departments', dept, checked)
                      }
                    >
                      {dept}
                    </DropdownMenuCheckboxItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  {uniqueStatuses.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={filters.statuses.includes(status)}
                      onCheckedChange={(checked) =>
                        handleFilterChange('statuses', status, checked)
                      }
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}

                  {hasActiveFilters && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="w-full justify-start"
                      >
                        Clear All Filters
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading users...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and bulk actions */}
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Search users..."
                  className="max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={
                      filteredUsers.length > 0 &&
                      selectedUsers.size === filteredUsers.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-gray-500">
                    Select all{' '}
                    {selectedUsers.size > 0 &&
                      `(${selectedUsers.size} selected)`}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    disabled={selectedUsers.size === 0}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedUsers.size})
                  </Button>
                </div>
              </div>

              {/* Users table styled like Executive Dashboard's Pending Invitations */}
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-center">
                    <tr>
                      <th className="text-slate-700 text-center px-4 py-2">
                        User
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Role
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Department
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Status
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.$id}
                        className="border-b text-center hover:bg-gray-50 transition-all duration-300"
                      >
                        <td className="pl-2 text-left">
                          <div className="flex items-center">
                            <Checkbox
                              checked={selectedUsers.has(user.$id)}
                              onCheckedChange={() => toggleSelectUser(user.$id)}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.fullName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {capitalizeRole(user.role)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 font-medium ${getUserStatusBadgeClasses(
                              user.status as string
                            )}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditUser(user);
                                setEditForm({
                                  fullName: user.fullName,
                                  department: user.department || '',
                                  role: user.role,
                                });
                              }}
                              className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeleteUser(user.$id)}
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#f87774',
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No users match the current filters'
                      : 'No users found'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-2"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => closeEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                name="fullName"
                value={editForm.fullName || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^ /, '');
                  setEditForm({ ...editForm, fullName: value });
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <Input
                name="department"
                value={editForm.department}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a role</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            {editError && <p className="text-red-600 text-sm">{editError}</p>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete the selected users? This action
            cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
