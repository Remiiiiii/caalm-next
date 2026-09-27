import type { Metadata } from "next";
import Link from "next/link";
import AdminRoleManager from "@/components/AdminRoleManager";
import StaticWaveBackdrop from "@/components/landing/StaticWaveBackdrop";

export const metadata: Metadata = {
	title: "Debug Role Manager | CAALM",
	description: "Admin tool for managing user roles",
};

export default function DebugRolePage() {
	return (
		<div className="relative min-h-screen">
			<StaticWaveBackdrop fixed muted />

			{/* Main Content */}
			<div className="relative z-10 p-6">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-slate-800 mb-2">
							Debug Role Manager
						</h1>
						<p className="text-slate-600">
							Temporary tool for managing user roles and debugging permission
							issues
						</p>
					</div>

					<AdminRoleManager />

					<div className="mt-8 text-center">
						<p className="text-sm text-slate-500">
							After updating your role to &quot;admin&quot;, refresh the page
							and try accessing
							<Link
								href="/analytics?tab=organization"
								className="text-blue-600 hover:underline ml-1"
							>
								/analytics?tab=organization
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
