'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';

interface CalendarResource {
  $id: string;
  name: string;
  type: 'room' | 'equipment';
  description?: string;
  location?: string;
  capacity?: number;
  features?: string[];
  requiresApproval: boolean;
  approvalWorkflowId?: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ResourceManagerProps {
  onResourceCreated?: (resource: CalendarResource) => void;
  onResourceUpdated?: (resource: CalendarResource) => void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  onResourceCreated,
  onResourceUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resources, setResources] = useState<CalendarResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'room' as 'room' | 'equipment',
    description: '',
    location: '',
    capacity: '',
    features: [] as string[],
    requiresApproval: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchResources();
    }
  }, [isOpen]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error(
        '[CLIENT] ResourceManager] Error fetching resources:',
        error
      );
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Resource name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/calendar/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'Resource created successfully',
        });
        setFormData({
          name: '',
          type: 'room',
          description: '',
          location: '',
          capacity: '',
          features: [],
          requiresApproval: false,
        });
        await fetchResources();
        onResourceCreated?.(data.resource);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create resource',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(
        '[CLIENT] ResourceManager] Error creating resource:',
        error
      );
      toast({
        title: 'Error',
        description: 'Failed to create resource',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const commonFeatures = [
    'projector',
    'whiteboard',
    'video-conference',
    'phone',
    'wifi',
    'catering',
    'parking',
  ];

  const toggleFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.includes(feature)
        ? formData.features.filter((f) => f !== feature)
        : [...formData.features, feature],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="primary-btn px-3 sm:px-4"
        >
          <Building2 className="w-4 h-4" />
          Manage Resources
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[700px] p-0 max-h-[90vh] flex flex-col">
        <VisuallyHiddenPrimitive.Root>
          <DialogTitle>Manage Resources</DialogTitle>
          <DialogDescription>
            Create and manage meeting rooms and equipment
          </DialogDescription>
        </VisuallyHiddenPrimitive.Root>
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center justify-between ml-6">
            <div className="flex items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#0f5384]" />
                  <h2 className="text-xl font-semibold sidebar-gradient-text">
                    Resource Management
                  </h2>
                </div>
                <p className="text-sm text-slate-600 mt-1 ml-7">
                  Manage meeting rooms and equipment for event bookings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Create New Resource Form */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Plus className="w-4 h-4 text-blue-600" />
              Create New Resource
            </Label>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="resource-name"
                    className="text-sm text-slate-700 mb-1 block"
                  >
                    Resource Name *
                  </Label>
                  <Input
                    id="resource-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Conference Room A"
                    className="bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="resource-type"
                    className="text-sm text-slate-700 mb-1 block"
                  >
                    Type *
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value as 'room' | 'equipment',
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="resource-description"
                  className="text-sm text-slate-700 mb-1 block"
                >
                  Description
                </Label>
                <Textarea
                  id="resource-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={2}
                  className="bg-white border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="resource-location"
                    className="text-sm text-slate-700 mb-1 block"
                  >
                    Location
                  </Label>
                  <Input
                    id="resource-location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Building, floor, etc."
                    className="bg-white border-slate-300"
                  />
                </div>

                {formData.type === 'room' && (
                  <div>
                    <Label
                      htmlFor="resource-capacity"
                      className="text-sm text-slate-700 mb-1 block"
                    >
                      Capacity
                    </Label>
                    <Input
                      id="resource-capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      placeholder="Max number of people"
                      className="bg-white border-slate-300"
                    />
                  </div>
                )}
              </div>

              {formData.type === 'room' && (
                <div>
                  <Label className="text-sm text-slate-700 mb-2 block">
                    Features
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {commonFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Checkbox
                          id={`feature-${feature}`}
                          checked={formData.features.includes(feature)}
                          onCheckedChange={() => toggleFeature(feature)}
                        />
                        <Label
                          htmlFor={`feature-${feature}`}
                          className="text-xs text-slate-700 cursor-pointer capitalize"
                        >
                          {feature.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires-approval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      requiresApproval: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="requires-approval"
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  Requires approval for bookings
                </Label>
              </div>
            </div>
          </div>

          {/* Existing Resources List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              Loading resources...
            </div>
          ) : resources.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">
                Available Resources
              </Label>
              {resources.map((resource) => (
                <div
                  key={resource.$id}
                  className="bg-white border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-slate-900">
                          {resource.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {resource.type === 'room' ? 'Room' : 'Equipment'}
                        </Badge>
                        {resource.requiresApproval && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Requires Approval
                          </Badge>
                        )}
                        {!resource.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-slate-500 mb-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        {resource.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {resource.location}
                          </div>
                        )}
                        {resource.capacity && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Capacity: {resource.capacity}
                          </div>
                        )}
                        {resource.features && resource.features.length > 0 && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {resource.features.length} feature
                            {resource.features.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No resources yet. Create one to get started.
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
              disabled={creating || !formData.name.trim()}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Resource
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
