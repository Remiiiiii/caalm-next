export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import BillingIntegrationsPage from "@/components/settings/BillingIntegrationsPage";
import { LoadingSpinner } from "@/components/ui/loading";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function BillingSettingsPage() {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return (
		<Suspense
			fallback={
				<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
					<LoadingSpinner size="sm" label="Loading billing…" />
				</div>
			}
		>
			<BillingIntegrationsPage />
		</Suspense>
	);
}
