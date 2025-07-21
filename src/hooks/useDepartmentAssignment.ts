import { useState, useEffect, useCallback } from 'react';
import {
  getContractDepartmentEnums,
  getAllManagers,
} from '@/lib/actions/database.actions';
import { AppUser } from '@/lib/actions/user.actions';
import { Models } from 'node-appwrite';

export const useDepartmentAssignment = () => {
  const [departmentEnums, setDepartmentEnums] = useState<string[]>([]);
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<AppUser[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch department enums and managers
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch department enums
      const deptEnums = await getContractDepartmentEnums();
      if (deptEnums) {
        setDepartmentEnums(deptEnums);
      }

      // Fetch all managers
      const allManagers = await getAllManagers();
      if (allManagers) {
        const managerUsers = (allManagers as Models.Document[]).map((u) => {
          return {
            fullName: u.fullName,
            email: u.email,
            avatar: u.avatar,
            accountId: u.$id || u.accountId, // Try $id first, fallback to accountId
            role: u.role,
            department: u.department,
            status: u.status,
          };
        });
        setManagers(managerUsers);
        setFilteredManagers(managerUsers);
      }
    } catch (error) {
      console.error('Failed to fetch department data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter managers when department selection changes
  useEffect(() => {
    if (selectedDepartment && managers.length > 0) {
      const filtered = managers.filter(
        (m) => m.department === selectedDepartment
      );
      setFilteredManagers(filtered);
      // Clear selected managers when department changes
      setSelectedManagers([]);
    } else {
      setFilteredManagers(managers);
    }
  }, [selectedDepartment, managers]);

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
