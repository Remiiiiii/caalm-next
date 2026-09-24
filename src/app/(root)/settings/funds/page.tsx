import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";
import { FundsSettingsClient } from "@/components/settings/FundsSettingsClient";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function FundsSettingsPage() {
	await requirePagePermission(PERMISSIONS.FUNDING.MANAGE);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex items-center gap-4">
				<Link href="/settings">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-4 w-4" />
						Settings
					</Button>
				</Link>
			</div>
			<div className="mb-4 flex items-center gap-3">
				<Landmark className="h-5 w-5 text-[#0f5384]" />
				<h1 className="h1 capitalize sidebar-gradient-text">Funds</h1>
			</div>
			<FundsSettingsClient />
		</div>
	);
}
