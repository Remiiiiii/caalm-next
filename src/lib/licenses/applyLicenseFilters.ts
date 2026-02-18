import type { License } from '@/types/licenses';
import type { LicenseFilters } from '@/components/LicensesView';

/**
 * Apply license filters to a list of licenses.
 * Single source of truth used by LicensesViewClient and LicensesHeaderActions.
 */
export function applyLicenseFilters(
  licenses: License[],
  filters: LicenseFilters
): License[] {
  if (!filters || Object.keys(filters).length === 0) {
    return licenses;
  }

  return licenses.filter((license: License) => {
    if (filters.status && license.status !== filters.status) {
      return false;
    }

    if (filters.licenseType && license.licenseType !== filters.licenseType) {
      return false;
    }

    if (filters.category && license.category !== filters.category) {
      return false;
    }

    if (filters.issueDateFrom || filters.issueDateTo) {
      const issueDate = license.issueDate
        ? new Date(license.issueDate)
        : null;
      if (!issueDate) return false;

      if (filters.issueDateFrom) {
        const fromDate = new Date(filters.issueDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (issueDate < fromDate) return false;
      }

      if (filters.issueDateTo) {
        const toDate = new Date(filters.issueDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (issueDate > toDate) return false;
      }
    }

    if (filters.expiryDateFrom || filters.expiryDateTo) {
      const expiryDate = license.licenseExpiryDate
        ? new Date(license.licenseExpiryDate)
        : null;
      if (!expiryDate) return false;

      if (filters.expiryDateFrom) {
        const fromDate = new Date(filters.expiryDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (expiryDate < fromDate) return false;
      }

      if (filters.expiryDateTo) {
        const toDate = new Date(filters.expiryDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (expiryDate > toDate) return false;
      }
    }

    if (filters.department) {
      const licenseDept = license.division || license.department;
      if (licenseDept !== filters.department) return false;
    }

    if (filters.assignedTo) {
      const assignedManagers = license.assignedManagers || [];
      const searchTerm = filters.assignedTo.toLowerCase();
      const hasMatch = assignedManagers.some((manager: string) =>
        manager.toLowerCase().includes(searchTerm)
      );
      if (!hasMatch) return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = (license.licenseName || '')
        .toLowerCase()
        .includes(query);
      const matchesNumber = (license.licenseNumber || '')
        .toLowerCase()
        .includes(query);
      const matchesVendor = (license.vendor || '')
        .toLowerCase()
        .includes(query);
      const matchesProduct = (license.product || '')
        .toLowerCase()
        .includes(query);
      if (!matchesName && !matchesNumber && !matchesVendor && !matchesProduct) {
        return false;
      }
    }

    return true;
  });
}
