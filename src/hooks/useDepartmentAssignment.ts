import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import {
  getContractDepartmentEnums,
  getAllManagers,
} from '@/lib/actions/database.actions';
import { AppUser } from '@/lib/actions/user.actions';
import { Models } from 'node-appwrite';
import { DIVISION_TO_DEPARTMENT } from '../../constants';

// Cache keys for SWR
const DEPARTMENTS_KEY = 'contract-departments';
const MANAGERS_KEY = 'all-managers';

// Fetcher functions
const fetchDepartments = async () => {
  const deptEnums = await getContractDepartmentEnums();
  return deptEnums || [];
};

const fetchManagers = async () => {
  const allManagers = await getAllManagers();
  if (!allManagers) return [];

  return (allManagers as Models.Document[]).map((u) => ({
    fullName: u.fullName,
    email: u.email,
    avatar: u.avatar,
    accountId: u.$id || u.accountId,
    role: u.role,
    division: u.division,
    status: u.status,
  })) as AppUser[];
};

export const useDepartmentAssignment = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  // Fetch departments with SWR caching - eager loading for instant display
  const { data: departmentEnums = [], isLoading: departmentsLoading } = useSWR(
    DEPARTMENTS_KEY,
    fetchDepartments,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      keepPreviousData: true,
      revalidateIfStale: false, // Don't revalidate if data exists (faster)
      revalidateOnMount: true, // Fetch on mount
    }
  );

  // Fetch managers with SWR caching - eager loading for instant display
  const { data: managers = [], isLoading: managersLoading } = useSWR(
    MANAGERS_KEY,
    fetchManagers,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      keepPreviousData: true,
      revalidateIfStale: false, // Don't revalidate if data exists (faster)
      revalidateOnMount: true, // Fetch on mount
    }
  );

  const loading = departmentsLoading || managersLoading;

  // Filter managers when department selection changes (memoized for performance)
  // Return directly from memo to avoid extra render cycle
  const filteredManagers = useMemo(() => {
    if (selectedDepartment && managers.length > 0) {
      // Filter managers whose division maps to the selected department
      return managers.filter((manager) => {
        if (!manager.division) return false;
        const managerDepartment = DIVISION_TO_DEPARTMENT[manager.division];
        return managerDepartment === selectedDepartment;
      });
    }
    return [];
  }, [selectedDepartment, managers]);

  // Clear selected managers when department changes
  useEffect(() => {
    if (selectedDepartment) {
      setSelectedManagers([]);
    }
  }, [selectedDepartment]);

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
  };

  const handleManagerToggle = (managerId: string) => {
    setSelectedManagers((prev) => {
      const newSelection = prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId];
      return newSelection;
    });
  };

  const resetSelection = () => {
    setSelectedDepartment(undefined);
    setSelectedManagers([]);
  };

  // Manual refresh function for backward compatibility
  // SWR automatically fetches on mount, but this allows manual refresh
  const fetchData = useCallback(async () => {
    await Promise.all([mutate(DEPARTMENTS_KEY), mutate(MANAGERS_KEY)]);
  }, []);

  return {
    departmentEnums,
    managers,
    filteredManagers,
    selectedDepartment,
    selectedManagers,
    loading,
    fetchData,
    handleDepartmentChange,
    handleManagerToggle,
    resetSelection,
  };
};
