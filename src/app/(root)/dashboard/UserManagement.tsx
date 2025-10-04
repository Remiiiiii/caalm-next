'use client';

import React, { useState } from 'react';
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
import { Trash, ListFilter } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { capitalizeRole } from '@/lib/utils';

const statusColor = {
  active: 'bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl',
  inactive: 'bg-destructive/10 text-destructive text-xs rounded-xl',
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
    // Implementation for select all functionality
    console.log('Toggle select all');
  };

  const toggleSelectUser = (id: string) => {
    // Implementation for selecting individual users
    console.log('Toggle select user:', id);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Management</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
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
                <Input placeholder="Search users..." className="max-w-sm" />
                <div className="flex items-center space-x-2">
                  <Checkbox onCheckedChange={toggleSelectAll} />
                  <span className="text-sm text-gray-500">Select all</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>

              {/* Users table */}
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {typedUsers.map((user) => (
                        <tr key={user.$id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Checkbox
                                onCheckedChange={() =>
                                  toggleSelectUser(user.$id)
                                }
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
                              className={
                                statusColor[
                                  user.status as keyof typeof statusColor
                                ]
                              }
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
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
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.$id)}
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
              </div>

              {users.length === 0 && !isLoading && (
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
