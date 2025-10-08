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
import { Trash, ListFilter, Trash2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { capitalizeRole } from '@/lib/utils';

const statusColor = {
  active: 'bg-[#ccf3e9] text-[#3dd9b3] text-xs rounded-xl px-2 py-1 font-medium',
  inactive: 'bg-[#fff1f1] text-[#fe8787] text-xs rounded-xl px-2 py-1 font-medium',
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
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
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
          <CardTitle className="flex items-center justify-between">
            <span className="sidebar-gradient-text">User Management</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40">
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
                <p className="mt-2 text-sm text-slate-600">Loading users...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and bulk actions */}
              <div className="flex items-center justify-between">
                <Input placeholder="Search users..." className="max-w-sm bg-white/30 backdrop-blur border border-white/40 shadow-md" />
                <div className="flex items-center space-x-2">
                  <Checkbox onCheckedChange={toggleSelectAll} />
                  <span className="text-sm text-slate-600">Select all</span>
                  <Button
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#f87774',
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>

              {/* Users table */}
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-center text-slate-700">
                          User
                        </th>
                        <th className="px-4 py-2 text-center text-slate-700">
                          Role
                        </th>
                        <th className="px-4 py-2 text-center text-slate-700">
                          Department
                        </th>
                        <th className="px-4 py-2 text-center text-slate-700">
                          Status
                        </th>
                        <th className="px-4 py-2 text-center text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {typedUsers.map((user) => (
                        <tr key={user.$id} className="hover:bg-gray-50 text-center">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Checkbox
                                onCheckedChange={() =>
                                  toggleSelectUser(user.$id)
                                }
                              />
                              <div className="ml-4 text-left">
                                <div className="text-sm font-medium text-slate-700">
                                  {user.fullName}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                            {capitalizeRole(user.role)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
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
                                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                              >
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
                                <Trash2 className="h-4 w-4" />
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
                  <p className="text-slate-600">No users found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => closeEditModal()}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="sidebar-gradient-text">Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <Input
                name="fullName"
                value={editForm.fullName || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^ /, '');
                  setEditForm({ ...editForm, fullName: value });
                }}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Department
              </label>
              <Input
                name="department"
                value={editForm.department}
                onChange={handleEditChange}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className="w-full px-3 py-2 bg-white/30 backdrop-blur border border-white/40 shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
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
              <Button type="button" variant="outline" onClick={closeEditModal} className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40">
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40">
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
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="sidebar-gradient-text">Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete the selected users? This action
            cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              style={{
                backgroundColor: '#ffffff',
                color: '#f87774',
              }}
            >
              Delete Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
