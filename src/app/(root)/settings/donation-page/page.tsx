import Link from "next/link";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { DonationPageSettingsClient } from "@/components/settings/DonationPageSettingsClient";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function DonationPageSettingsPage() {
	await requirePagePermission(PERMISSIONS.DONATIONS.CONFIG_VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex items-center gap-4">
				<Link href="/settings/organization">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-4 w-4" />
						Settings
					</Button>
				</Link>
			</div>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<HeartHandshake className="h-5 w-5 text-[#0f5384]" />
					<h1 className="h1 capitalize sidebar-gradient-text">
						Donation page settings
					</h1>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-2.5 py-1 text-xs text-slate-600">
					<span className="font-medium text-slate-700">donations.config.edit</span>
				</span>
			</div>
			<DonationPageSettingsClient />
		</div>
	);
}
