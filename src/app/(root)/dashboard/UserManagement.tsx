'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // Create or use your own
import { useToast } from '@/hooks/use-toast';
import { listAllUsers } from '@/lib/actions/user.actions';
import type { AppUser } from '@/lib/actions/user.actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash, ListFilter } from 'lucide-react';

const statusColor = {
  active: 'bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl',
  inactive: 'bg-destructive/10 text-destructive text-xs rounded-xl',
};

const UserManagement = () => {
  const [users, setUsers] = useState<
    (AppUser & { $id: string; department?: string })[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
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

  // Type guard for user document
  function isAppUserDoc(
    u: unknown
  ): u is AppUser & { $id: string; department?: string } {
    return (
      typeof u === 'object' &&
      u !== null &&
      'fullName' in u &&
      'email' in u &&
      'avatar' in u &&
      'accountId' in u &&
      'role' in u &&
      '$id' in u
    );
  }

  // Fetch all users for executive user management
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await listAllUsers();
      const mapped = (data ?? []).filter(isAppUserDoc).map((u) => ({
        $id: u.$id,
        fullName: u.fullName,
        email: u.email,
        avatar: u.avatar,
        accountId: u.accountId,
        role: u.role,
        department: u.department,
        status: u.status || 'active', // fallback to 'active'
      }));
      setUsers(mapped);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setEditError(null);
    // Validation
    if (!editForm.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }
    if (!editForm.department) {
      setEditError('Department is required.');
      return;
    }
    if (!editForm.role) {
      setEditError('Role is required.');
      return;
    }
    setEditLoading(true);
    try {
      if (!editUser || !editUser.accountId) throw new Error('No user selected');
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: editUser.accountId,
          ...editForm,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }
      // Refresh users list
      await fetchUsers();
      toast({
        title: 'User updated',
        description: 'User profile updated successfully.',
      });
      closeEditModal();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Example: Add search and pagination state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);

  // Filtered users for search
  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * perPage,
    page * perPage
  );

  // 1. Add state for selected users
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // 2. Checkbox logic
  const isAllSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((u) => selectedUserIds.includes(u.$id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds(
        selectedUserIds.filter(
          (id) => !paginatedUsers.some((u) => u.$id === id)
        )
      );
    } else {
      setSelectedUserIds([
        ...selectedUserIds,
        ...paginatedUsers
          .filter((u) => !selectedUserIds.includes(u.$id))
          .map((u) => u.$id),
      ]);
    }
  };
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(
      selectedUserIds.includes(id)
        ? selectedUserIds.filter((uid) => uid !== id)
        : [...selectedUserIds, id]
    );
  };

  // 3. Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      for (const userId of selectedUserIds) {
        await fetch('/api/user/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      }
      await fetchUsers();
      setSelectedUserIds([]);
      toast({
        title: 'Users deleted',
        description: 'Selected users have been deleted.',
      });
      setShowBulkDeleteDialog(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete selected users.',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // 4. Add Delete Selected button above the table
  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Search Users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/30 backdrop-blur border border-white/40 shadow-md"
          />
          <Button
            variant="outline"
            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
          >
            <span className="sr-only ">Filter</span>
            <ListFilter className="w-4 h-4 mr-1 text-slate-700" />
            Filter
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedUserIds.length > 0 && (
          <div className="flex gap-2 p-3 rounded-lg border border-cyan-200/30 mb-4">
            <Button
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleteLoading}
              className="mb-2 flex items-center gap-2 bg-destructive/10 text-destructive border-destructive hover:bg-destructive/20"
            >
              <Trash className="w-4 h-4 mr-1" />
              <span>{selectedUserIds.length}</span>
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center align-middle">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-slate-700">Name</th>
                <th className="text-slate-700">Email</th>
                <th className="text-slate-700">Department</th>
                <th className="text-slate-700">Role</th>
                <th className="text-slate-700">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.$id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="text-center align-middle">
                      <Checkbox
                        checked={selectedUserIds.includes(user.$id)}
                        onCheckedChange={() => toggleSelectUser(user.$id)}
                      />
                    </td>
                    <td className="pl-2">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.department || '-'}</td>
                    <td>{user.role}</td>
                    <td>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          statusColor[
                            user.status as keyof typeof statusColor
                          ] || 'bg-[#B3EBF2] text-[#12477D]'
                        }`}
                      >
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <Button variant="link" size="sm">
                        View details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <label className="text-xs text-slate-700">
              Items per page:
              <select
                className="ml-2 border rounded px-2 py-1"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                {[6, 10, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="ml-4 text-gray-500">
              {`${(page - 1) * perPage + 1}-${Math.min(
                page * perPage,
                filteredUsers.length
              )} of ${filteredUsers.length} items`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * perPage >= filteredUsers.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={closeEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Full Name</label>
              <Input
                name="fullName"
                value={editForm.fullName}
                onChange={handleEditChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Department</label>
              <select
                name="department"
                value={editForm.department}
                onChange={handleEditChange}
                className="w-full border rounded px-2 py-1"
                required
              >
                <option value="">Select department</option>
                <option value="childwelfare">Child Welfare</option>
                <option value="behavioralhealth">Behavioral Health</option>
                <option value="finance">Finance</option>
                <option value="operations">Operations</option>
                <option value="administration">Administration</option>
                <option value="c-suite">C-Suite</option>
                <option value="managerial">Managerial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className="w-full border rounded px-2 py-1"
                required
              >
                <option value="executive">Executive</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editError && (
              <div className="text-red-600 text-sm">{editError}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {editLoading && (
              <div className="text-center text-slate-500">
                Saving changes...
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Users</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-sm text-gray-700">
            Are you sure you want to delete the following users? This action
            cannot be undone.
          </div>
          <ul className="max-h-48 overflow-y-auto mb-4 divide-y divide-gray-200">
            {users
              .filter((u) => selectedUserIds.includes(u.$id))
              .map((user) => (
                <li
                  key={user.$id}
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{user.fullName}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <span className="text-xs text-gray-400">{user.role}</span>
                </li>
              ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-destructive/10 text-destructive border-destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserManagement;
