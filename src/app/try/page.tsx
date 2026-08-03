import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDemoOrgTtlDays } from "@/lib/config/demo-mode";

export default function TryDemoPage() {
	const ttlDays = getDemoOrgTtlDays();

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
			<div className="max-w-lg w-full glass-card rounded-xl border border-slate-200 shadow-lg p-8 sm:p-10">
				<div className="glass-card-cap" />
				<p className="text-sm font-medium text-[#0f5384] mb-2">CAALM Demo</p>
				<h1 className="h1 sidebar-gradient-text mb-3">Try the sandbox</h1>
				<p className="text-slate-600 mb-6">
					Start a private sample organization with contracts, licenses, calendar
					approvals, and dashboards. No real email or client data is required.
				</p>
				<ul className="text-sm text-slate-600 space-y-2 mb-8 list-disc pl-5">
					<li>A unique sandbox ID is assigned automatically</li>
					<li>Use the demo OTP shown on the next screen</li>
					<li>Two factor authentication is skipped in demo mode</li>
					<li>Your sandbox expires automatically after {ttlDays} days</li>
				</ul>
				<div className="flex flex-col sm:flex-row gap-3">
					<Button asChild className="primary-btn px-3 sm:px-4">
						<Link href="/sign-up">Start free sandbox</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="primary-btn px-3 sm:px-4"
					>
						<Link href="/sign-in">Sign in to existing sandbox</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
