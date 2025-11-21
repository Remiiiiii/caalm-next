'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  UserCog,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';

interface CalendarDelegation {
  $id: string;
  calendarId: string;
  delegatorId: string;
  delegateId: string;
  permissions: string[];
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageParticipants: boolean;
  canViewSensitiveDetails: boolean;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CalendarDelegationManagerProps {
  calendarId?: string;
  onDelegationCreated?: (delegation: CalendarDelegation) => void;
}

export const CalendarDelegationManager: React.FC<
  CalendarDelegationManagerProps
> = ({ calendarId, onDelegationCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [delegations, setDelegations] = useState<CalendarDelegation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [delegateSearch, setDelegateSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDelegate, setSelectedDelegate] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    calendarId: calendarId || '',
    delegateId: '',
    permissions: [] as string[],
    canCreateEvents: false,
    canEditEvents: false,
    canDeleteEvents: false,
    canManageParticipants: false,
    canViewSensitiveDetails: false,
    startDate: '',
    endDate: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchDelegations();
    }
  }, [isOpen]);

  const fetchDelegations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/delegations');
      if (response.ok) {
        const data = await response.json();
        setDelegations(data.delegations || []);
      }
    } catch (error) {
      console.error(
        '[CLIENT] CalendarDelegationManager] Error fetching delegations:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error(
        '[CLIENT] CalendarDelegationManager] Error searching users:',
        error
      );
    }
  };

  const handleCreate = async () => {
    if (!formData.calendarId || !formData.delegateId) {
      toast({
        title: 'Validation Error',
        description: 'Calendar and delegate are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/calendar/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'Delegation created successfully',
        });
        setFormData({
          calendarId: calendarId || '',
          delegateId: '',
          permissions: [],
          canCreateEvents: false,
          canEditEvents: false,
          canDeleteEvents: false,
          canManageParticipants: false,
          canViewSensitiveDetails: false,
          startDate: '',
          endDate: '',
        });
        setSelectedDelegate(null);
        await fetchDelegations();
        onDelegationCreated?.(data.delegation);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create delegation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(
        '[CLIENT] CalendarDelegationManager] Error creating delegation:',
        error
      );
      toast({
        title: 'Error',
        description: 'Failed to create delegation',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="primary-btn px-3 sm:px-4"
        >
          <UserCog className="w-4 h-4" />
          Manage Delegations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[700px] p-0 max-h-[90vh] flex flex-col">
        <VisuallyHiddenPrimitive.Root>
          <DialogTitle>Manage Calendar Delegations</DialogTitle>
          <DialogDescription>
            Grant calendar management permissions to other users
          </DialogDescription>
        </VisuallyHiddenPrimitive.Root>
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center justify-between ml-6">
            <div className="flex items-center">
              <div>
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-[#0f5384]" />
                  <h2 className="text-xl font-semibold sidebar-gradient-text">
                    Calendar Delegations
                  </h2>
                </div>
                <p className="text-sm text-slate-600 mt-1 ml-7">
                  Allow others to manage your calendars on your behalf
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Create New Delegation Form */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Plus className="w-4 h-4 text-blue-600" />
              Create New Delegation
            </Label>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="delegate-search"
                  className="text-sm text-slate-700 mb-1 block"
                >
                  Delegate *
                </Label>
                <Input
                  id="delegate-search"
                  value={delegateSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDelegateSearch(value);
                    searchUsers(value);
                  }}
                  placeholder="Search for a user..."
                  className="bg-white border-slate-300"
                />
                {delegateSearch.length >= 2 && searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                    {searchResults.map((user) => (
                      <div
                        key={user.$id}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setSelectedDelegate(user);
                          setFormData({ ...formData, delegateId: user.$id });
                          setDelegateSearch(
                            user.fullName || user.name || user.email
                          );
                          setSearchResults([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
                            {(user.fullName || user.name || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-slate-900">
                              {user.fullName || user.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm text-slate-700 mb-2 block">
                  Permissions
                </Label>
                <div className="space-y-2">
                  {[
                    { key: 'canCreateEvents', label: 'Create Events' },
                    { key: 'canEditEvents', label: 'Edit Events' },
                    { key: 'canDeleteEvents', label: 'Delete Events' },
                    {
                      key: 'canManageParticipants',
                      label: 'Manage Participants',
                    },
                    {
                      key: 'canViewSensitiveDetails',
                      label: 'View Sensitive Details',
                    },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={perm.key}
                        checked={
                          formData[perm.key as keyof typeof formData] as boolean
                        }
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            [perm.key]: checked,
                          })
                        }
                      />
                      <Label
                        htmlFor={perm.key}
                        className="text-sm text-slate-700 cursor-pointer"
                      >
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Existing Delegations List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              Loading delegations...
            </div>
          ) : delegations.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">
                Active Delegations
              </Label>
              {delegations.map((delegation) => (
                <div
                  key={delegation.$id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-900">
                        Delegate ID: {delegation.delegateId}
                      </span>
                      {delegation.isActive ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {delegation.canCreateEvents && (
                        <Badge variant="outline">Create</Badge>
                      )}
                      {delegation.canEditEvents && (
                        <Badge variant="outline">Edit</Badge>
                      )}
                      {delegation.canDeleteEvents && (
                        <Badge variant="outline">Delete</Badge>
                      )}
                      {delegation.canManageParticipants && (
                        <Badge variant="outline">Manage Participants</Badge>
                      )}
                      {delegation.canViewSensitiveDetails && (
                        <Badge variant="outline">View Sensitive</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No delegations yet. Create one to grant calendar access to others.
            </div>
          )}
        </div>

        {/* Professional Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              className="primary-btn"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
            <Button
              className="primary-btn"
              onClick={handleCreate}
              disabled={creating || !formData.delegateId}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Delegation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
