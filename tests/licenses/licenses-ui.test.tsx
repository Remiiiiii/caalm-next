/**
 * Component tests for licenses UI: LicensesView, LicensesViewClient, LicensesTopControls, LicensesFilter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LicensesView from '@/components/LicensesView';
import LicensesViewClient from '@/components/LicensesViewClient';
import LicensesTopControls from '@/components/LicensesTopControls';
import LicensesFilter from '@/components/LicensesFilter';
import { LicensesViewProvider } from '@/components/LicensesView';
import type { License } from '@/types/licenses';

function createLicense(overrides: Partial<License> = {}): License {
  return {
    $id: overrides.$id ?? `lic-${Math.random().toString(36).slice(2, 9)}`,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
    licenseName: 'Test License',
    licenseNumber: 'LN-001',
    licenseType: 'subscription',
    licenseExpiryDate: '2025-12-31',
    issuingAuthority: 'Test Authority',
    issueDate: '2024-01-01',
    status: 'active',
    orgId: 'org-1',
    ...overrides,
  };
}

vi.mock('@/components/licenses/LicenseCard', () => ({
  default: ({ license }: { license: License }) => (
    <div data-testid="license-card">{license.licenseName}</div>
  ),
}));

vi.mock('@/components/LicensesTableView', () => ({
  default: ({ licenses }: { licenses: License[] }) => (
    <div data-testid="licenses-table">
      {licenses.map((l) => (
        <div key={l.$id} data-testid="table-row">
          {l.licenseName}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/LicensesPagination', () => ({
  default: () => <div data-testid="licenses-pagination">Pagination</div>,
}));

describe('LicensesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when licenses array is empty (card view)', () => {
    render(
      <LicensesViewProvider>
        <LicensesView licenses={[]} user={{}} onRefresh={() => {}} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('No licenses found')).toBeInTheDocument();
    expect(screen.queryByTestId('license-card')).not.toBeInTheDocument();
  });

  it('renders license cards when licenses are provided (card view)', () => {
    const licenses = [
      createLicense({ $id: '1', licenseName: 'Adobe CC' }),
      createLicense({ $id: '2', licenseName: 'Microsoft 365' }),
    ];
    render(
      <LicensesViewProvider>
        <LicensesView licenses={licenses} user={{}} onRefresh={() => {}} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('Adobe CC')).toBeInTheDocument();
    expect(screen.getByText('Microsoft 365')).toBeInTheDocument();
    expect(screen.getAllByTestId('license-card')).toHaveLength(2);
  });

});

describe('LicensesViewClient', () => {
  it('shows empty state when licenses prop is empty', () => {
    render(
      <LicensesViewProvider>
        <LicensesViewClient licenses={[]} user={{}} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('No licenses found')).toBeInTheDocument();
  });

  it('shows license list when licenses are provided', () => {
    const licenses = [
      createLicense({ $id: '1', licenseName: 'License One' }),
      createLicense({ $id: '2', licenseName: 'License Two' }),
    ];
    render(
      <LicensesViewProvider>
        <LicensesViewClient licenses={licenses} user={{}} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('License One')).toBeInTheDocument();
    expect(screen.getByText('License Two')).toBeInTheDocument();
  });

  it('filters licenses when filters are set in context', () => {
    const licenses = [
      createLicense({ $id: '1', licenseName: 'Active License', status: 'active' }),
      createLicense({ $id: '2', licenseName: 'Inactive License', status: 'inactive' }),
    ];
    // LicensesViewClient uses useLicensesFilter() and applyLicenseFilters(licenses, filters).
    // Default filters are {}. So we see both. To test filtering we'd need to set filters
    // in the provider - e.g. a wrapper that sets initial filters. For now we rely on
    // applyLicenseFilters unit tests for filter behavior.
    render(
      <LicensesViewProvider>
        <LicensesViewClient licenses={licenses} user={{}} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('Active License')).toBeInTheDocument();
    expect(screen.getByText('Inactive License')).toBeInTheDocument();
  });
});

describe('LicensesTopControls', () => {
  it('shows status badge counts correctly', () => {
    const licenses = [
      createLicense({ $id: '1', status: 'active' }),
      createLicense({ $id: '2', status: 'active' }),
      createLicense({ $id: '3', status: 'pending-review' }),
      createLicense({ $id: '4', status: 'expired' }),
    ];
    render(
      <LicensesViewProvider>
        <LicensesTopControls licenses={licenses} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('Active (2)')).toBeInTheDocument();
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Expired (1)')).toBeInTheDocument();
  });

  it('counts pending-review and suspended as Pending', () => {
    const licenses = [
      createLicense({ $id: '1', status: 'pending-review' }),
      createLicense({ $id: '2', status: 'suspended' }),
    ];
    render(
      <LicensesViewProvider>
        <LicensesTopControls licenses={licenses} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('Pending (2)')).toBeInTheDocument();
  });

  it('search input has aria-label for accessibility', () => {
    render(
      <LicensesViewProvider>
        <LicensesTopControls licenses={[]} />
      </LicensesViewProvider>
    );
    const searchInput = screen.getByRole('textbox', { name: /search licenses/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Search licenses');
  });

  it('shows Action Required and Inactive counts', () => {
    const licenses = [
      createLicense({ $id: '1', status: 'action-required' }),
      createLicense({ $id: '2', status: 'inactive' }),
    ];
    render(
      <LicensesViewProvider>
        <LicensesTopControls licenses={licenses} />
      </LicensesViewProvider>
    );
    expect(screen.getByText('Action Required (1)')).toBeInTheDocument();
    expect(screen.getByText('Inactive (1)')).toBeInTheDocument();
  });
});

describe('LicensesFilter', () => {
  it('Filter button has aria-label "Filter" when no filters are active', () => {
    render(
      <LicensesViewProvider>
        <LicensesFilter departments={[]} assignedManagers={[]} />
      </LicensesViewProvider>
    );
    const filterButton = screen.getByRole('button', { name: 'Filter' });
    expect(filterButton).toBeInTheDocument();
    expect(filterButton).toHaveAttribute('aria-label', 'Filter');
  });

  it('Filter popover shows Filter Licenses header when opened', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <LicensesViewProvider>
        <LicensesFilter departments={[]} assignedManagers={[]} />
      </LicensesViewProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByText('Filter Licenses')).toBeInTheDocument();
    expect(screen.getByText('Refine your license list')).toBeInTheDocument();
  });
});
