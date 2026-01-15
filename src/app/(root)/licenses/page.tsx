import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import LicensesMetricsBar from '@/components/LicensesMetricsBar';
import { LicensesViewProvider } from '@/components/LicensesView';
import LicensesTopControls from '@/components/LicensesTopControls';
import LicensesControlBar from '@/components/LicensesControlBar';
import LicensesViewClient from '@/components/LicensesViewClient';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import type { License } from '@/types/licenses';
import Image from 'next/image';
import LicenseForm from '@/components/licenses/LicenseForm';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';

const Page = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  let licenses: License[] = [];

  try {
    const { tablesDB } = await createAdminClient();
    const defaultOrg = await getUserDefaultOrganization(user.$id);
    const orgId = defaultOrg?.orgId || user.orgId || 'default-org';

    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.licensesCollectionId || 'licenses',
      queries: [
        Query.equal('orgId', orgId),
        Query.orderDesc('$createdAt'),
        Query.limit(1000),
      ],
    });

    licenses = result.rows as unknown as License[];
  } catch (error) {
    console.error('Error fetching licenses:', error);
    licenses = [];
  }

  // Extract unique departments and assigned managers for filters
  const uniqueDepartments = Array.from(
    new Set(
      licenses
        .map((l) => l.division || l.department)
        .filter((d): d is string => !!d)
    )
  ).sort();

  const uniqueAssignedManagers = Array.from(
    new Set(
      licenses
        .flatMap((l) => l.assignedManagers || [])
        .filter((m): m is string => !!m)
    )
  ).sort();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
        <h1 className="h1 capitalize sidebar-gradient-text">Licenses</h1>
      </div>

      <div className="mb-6 flex items-center justify-end">
        <LicenseForm />
      </div>

      <LicensesViewProvider>
        <section className="w-full">
          <LicensesMetricsBar licenses={licenses} />
          <LicensesTopControls
            licenses={licenses}
            departments={uniqueDepartments}
            assignedManagers={uniqueAssignedManagers}
          />
          <LicensesControlBar />
        </section>

        {licenses.length > 0 ? (
          <LicensesViewClient licenses={licenses} user={user} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
            <Image
              src="/assets/icons/no-data.svg"
              alt="No licenses found"
              width={250}
              height={250}
              className="mb-4 opacity-60"
            />
            <p className="body-1 text-slate-700">No licenses found</p>
          </div>
        )}
      </LicensesViewProvider>
    </div>
  );
};

export default Page;
