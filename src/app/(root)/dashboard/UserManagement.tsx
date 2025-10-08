'use client';

import React, { useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Derived filtered users based on search query (name or email or department or role)
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return typedUsers;
    return typedUsers.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return (
        name.includes(q) || email.includes(q) || dept.includes(q) || role.includes(q)
      );
    });
  }, [typedUsers, search]);

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
    const allVisibleIds = new Set(filteredUsers.map((u) => u.$id));
    const isAllSelected = filteredUsers.every((u) => selectedIds.has(u.$id));
    if (isAllSelected) {
      // Deselect only the currently visible ones
      const next = new Set(selectedIds);
      allVisibleIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      // Select all visible
      const next = new Set(selectedIds);
      allVisibleIds.forEach((id) => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      // Here you would typically call an API to delete multiple users
      console.log('Bulk deleting users:', Array.from(selectedIds));

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Success',
        description: 'Selected users deleted successfully',
      });

      setShowBulkDeleteDialog(false);
      setSelectedIds(new Set());
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
              <Button
                variant="outline"
                size="sm"
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                <ListFilter className="h-4 w-4 mr-2" />
                Filter
              </Button>
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={
                      filteredUsers.length > 0 &&
                      filteredUsers.every((u) => selectedIds.has(u.$id))
                        ? true
                        : selectedIds.size > 0 &&
                          filteredUsers.some((u) => selectedIds.has(u.$id))
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-gray-500">Select all</span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 text-xs">
                    Selected: {selectedIds.size}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>

              {/* Users table styled like Executive Dashboard's Pending Invitations */}
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-center">
                    <tr>
                      <th className="text-slate-700 text-center px-4 py-2">User</th>
                      <th className="text-slate-700 text-center px-4 py-2">Role</th>
                      <th className="text-slate-700 text-center px-4 py-2">Department</th>
                      <th className="text-slate-700 text-center px-4 py-2">Status</th>
                      <th className="text-slate-700 text-center px-4 py-2">Actions</th>
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
                              checked={selectedIds.has(user.$id)}
                              onCheckedChange={() => toggleSelectUser(user.$id)}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.fullName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
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
                          <span className={`inline-block px-2 py-1 font-medium ${getUserStatusBadgeClasses(user.status as string)}`}>
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
                              style={{ backgroundColor: '#ffffff', color: '#f87774' }}
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
                  <p className="text-gray-500">No users found</p>
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
