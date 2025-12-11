'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PermissionSelector from '@/components/admin/PermissionSelector';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Role {
  $id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  orgId?: string;
}

interface Permission {
  $id: string;
  key: string;
  name: string;
  category: string;
  description?: string;
}

const RoleDetail = ({ roleId }: { roleId: string }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const { toast } = useToast();
  const router = useRouter();
  const { orgId } = useOrganization();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/roles/${roleId}`);
        const data = await response.json();

        if (data.success) {
          setRole(data.data.role);
          setFormData({
            name: data.data.role.name,
            description: data.data.role.description || '',
          });
          setSelectedPermissions(
            new Set(data.data.permissions.map((p: Permission) => p.key))
          );
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to fetch role',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch role',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/admin/permissions');
        const data = await response.json();

        if (data.success) {
          setPermissions(data.data.all || []);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };

    fetchRole();
    fetchPermissions();
  }, [roleId, toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissionKeys: Array.from(selectedPermissions),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Role updated successfully',
        });
        router.push('/dashboard/admin/roles');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Role not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/admin/roles')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Role</h1>
          <p className="text-muted-foreground mt-2">
            {role.isSystemRole && (
              <Badge variant="default" className="mt-2">
                System Role
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={role.isSystemRole}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={role.isSystemRole}
                rows={4}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || role.isSystemRole}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <PermissionSelector
              permissions={permissions}
              selectedPermissions={selectedPermissions}
              onSelectionChange={setSelectedPermissions}
              disabled={role.isSystemRole}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleDetail;

