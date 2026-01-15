import { getCurrentUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import LicensesMetricsBar from '@/components/LicensesMetricsBar';
import LicenseList from '@/components/licenses/LicenseList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

    licenses = result.rows as License[];
  } catch (error) {
    console.error('Error fetching licenses:', error);
    licenses = [];
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
        <h1 className="h1 capitalize sidebar-gradient-text">Licenses</h1>
      </div>

      <div className="mb-6 flex items-center justify-end">
        <LicenseForm />
      </div>

      <section className="w-full">
        <LicensesMetricsBar licenses={licenses} />
      </section>

      {licenses.length > 0 ? (
        <LicenseList licenses={licenses} />
      ) : (
        <div className="text-center py-12">
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
    </div>
  );
};

export default Page;
