'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Database,
  TrendingUp,
  BarChart3,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import useSWR from 'swr';

interface AuditLog {
  event_id: string;
  event_title: string;
  action: 'delete' | 'sync_delete' | 'restore';
  source: 'caalm' | 'outlook';
  user_id: string;
  user_name: string;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface AuditStats {
  totalDeletions: number;
  successRate: number;
  failedSyncs: number;
  pendingSyncs: number;
  deletionsByUser: Array<{ user_name: string; count: number }>;
  deletionsByDate: Array<{ date: string; count: number }>;
}

interface Filters {
  startDate: string;
  endDate: string;
  userId: string;
  action: string;
  status: string;
  search: string;
}

const AuditLogsPage = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    userId: '',
    action: 'all',
    status: 'all',
    search: '',
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch audit logs
  const {
    data: logsData,
    error: logsError,
    mutate: refreshLogs,
  } = useSWR(
    `/api/audits/logs?${new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v && v !== 'all')
      ),
      limit: '100',
    })}`,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch audit stats
  const { data: statsData, error: statsError } = useSWR(
    '/api/audits/stats',
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audit stats');
      return response.json();
    },
    { refreshInterval: 60000 } // Refresh every minute
  );

  const auditLogs: AuditLog[] = logsData?.logs || [];
  const auditStats: AuditStats = statsData?.stats;

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: 'all',
      status: 'all',
      search: '',
    });
  };

  const exportToCSV = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v && v !== 'all')
        ),
      });

      const response = await fetch(`/api/audits/logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to export audit logs');

      const data = await response.json();
      const logs = data.logs;

      // Create CSV content
      const headers = [
        'Timestamp',
        'Event ID',
        'Event Title',
        'Action',
        'Source',
        'User Name',
        'User Email',
        'IP Address',
        'Reason',
        'Status',
        'Error Message',
      ];

      const rows = logs.map((log: AuditLog) => [
        log.created_at,
        log.event_id,
        log.event_title,
        log.action,
        log.source,
        log.user_name,
        log.user_email,
        log.ip_address || '',
        log.reason || '',
        log.status,
        log.error_message || '',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((field: any) => `"${field.toString().replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Audit logs exported successfully',
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const toggleRowExpansion = (eventId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge
            variant="default"
            className="bg-emerald-100 text-emerald-800 border-emerald-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-800 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 border-amber-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'delete':
        return (
          <Badge
            variant="destructive"
            className="bg-white text-[#db2a2a] border-text-slate-700"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Delete
          </Badge>
        );
      case 'sync_delete':
        return (
          <Badge
            variant="secondary"
            className="bg-blue text-white border-blue-200"
          >
            <Database className="w-3 h-3 mr-1" />
            Sync Delete
          </Badge>
        );
      case 'restore':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Restore
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (logsError || statsError) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="h3 text-red-600 mb-2">Error Loading Audit Logs</h3>
              <p className="body-1 text-slate-600">
                {logsError?.message || statsError?.message}
              </p>
              <Button
                onClick={() => refreshLogs()}
                className="mt-4 primary-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="h1 sidebar-gradient-text">Audit Logs</h1>
              <p className="body-1 text-slate-600 mt-1">
                Monitor calendar event deletions and sync operations
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => refreshLogs()}
              variant="outline"
              className="primary-btn flex items-center gap-2 px-4 py-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={exportToCSV}
              className="primary-btn flex items-center gap-2 px-4 py-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Professional Stats Cards */}
      {auditStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="dashboard-summary-card hover:shadow-drop-3 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-slate-600 mb-1">Total Deletions</p>
                  <p className="h2 text-slate-900">
                    {auditStats.totalDeletions}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-summary-card hover:shadow-drop-3 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-slate-600 mb-1">Success Rate</p>
                  <p className="h2 text-emerald-600">
                    {auditStats.successRate.toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-summary-card hover:shadow-drop-3 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-slate-600 mb-1">Failed Syncs</p>
                  <p className="h2 text-red-600">{auditStats.failedSyncs}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-summary-card hover:shadow-drop-3 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-slate-600 mb-1">Pending Syncs</p>
                  <p className="h2 text-amber-600">{auditStats.pendingSyncs}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Professional Filters */}
      <Card className="mb-8 shadow-drop-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 h3">
              <Filter className="w-5 h-5 text-slate-600" />
              Filters & Search
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              {isFiltersOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Filters
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Filters
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {isFiltersOpen && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <Label
                  htmlFor="startDate"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange('startDate', e.target.value)
                  }
                  className="shad-input"
                />
              </div>
              <div>
                <Label
                  htmlFor="endDate"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange('endDate', e.target.value)
                  }
                  className="shad-input"
                />
              </div>
              <div>
                <Label
                  htmlFor="action"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  Action
                </Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => handleFilterChange('action', value)}
                >
                  <SelectTrigger className="shad-input">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="sync_delete">Sync Delete</SelectItem>
                    <SelectItem value="restore">Restore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="status"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="shad-input">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="search"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Search events..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange('search', e.target.value)
                    }
                    className="shad-input pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full h-12 border-slate-200 hover:bg-slate-50"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Professional Audit Logs Table */}
      <Card className="shadow-drop-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 h3">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              Audit Logs
              <Badge
                variant="secondary"
                className="ml-2 bg-slate-100 text-slate-700"
              >
                {auditLogs.length} entries
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity className="w-4 h-4" />
              Auto-refresh every 30s
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50">
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Timestamp
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Event Title
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Action
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Source
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    User
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
                          <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="h4 text-slate-600 mb-2">
                            No Audit Logs Found
                          </h3>
                          <p className="body-1 text-slate-500">
                            No audit logs match your current filters
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <React.Fragment key={`${log.event_id}-${log.created_at}`}>
                      <TableRow className="hover:bg-slate-50 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="body-2 text-slate-700">
                              {format(
                                new Date(log.created_at),
                                'MMM dd, yyyy HH:mm'
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-medium text-slate-900 max-w-[200px] truncate">
                            {log.event_title}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="capitalize bg-slate-50 text-slate-700 border-slate-200"
                          >
                            {log.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 text-sm">
                                {log.user_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {log.user_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(log.event_id)}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                            {expandedRows.has(log.event_id) ? 'Hide' : 'Show'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.event_id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-50 p-0">
                            <div className="p-6 border-t border-slate-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <div>
                                    <Label className="body-2 text-slate-600">
                                      Event ID
                                    </Label>
                                    <p className="font-mono text-sm text-slate-900 bg-white p-2 rounded border">
                                      {log.event_id}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="body-2 text-slate-600">
                                      IP Address
                                    </Label>
                                    <p className="text-sm text-slate-900">
                                      {log.ip_address || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="body-2 text-slate-600">
                                      Reason
                                    </Label>
                                    <p className="text-sm text-slate-900">
                                      {log.reason || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <Label className="body-2 text-slate-600">
                                      User Agent
                                    </Label>
                                    <p className="text-sm text-slate-900 break-all">
                                      {log.user_agent || 'N/A'}
                                    </p>
                                  </div>
                                  {log.error_message && (
                                    <div>
                                      <Label className="body-2 text-red-600">
                                        Error Message
                                      </Label>
                                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">
                                          {log.error_message}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  {log.metadata && (
                                    <div>
                                      <Label className="body-2 text-slate-600">
                                        Metadata
                                      </Label>
                                      <pre className="mt-1 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 overflow-x-auto">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
