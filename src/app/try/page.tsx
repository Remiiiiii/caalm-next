import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TryDemoPage() {
	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
			<div className="max-w-lg w-full glass-card rounded-xl border border-slate-200 shadow-lg p-8 sm:p-10">
				<div className="glass-card-cap" />
				<p className="text-sm font-medium text-[#0f5384] mb-2">CAALM Demo</p>
				<h1 className="h1 sidebar-gradient-text mb-3">Try the sandbox</h1>
				<p className="text-slate-600 mb-6">
					Sign up with your email and explore a private fake company —
					contracts, licenses, calendar approvals, and dashboards. No real
					client data.
				</p>
				<ul className="text-sm text-slate-600 space-y-2 mb-8 list-disc pl-5">
					<li>Use the demo OTP shown on the sign-up screen</li>
					<li>2FA is skipped in demo mode</li>
					<li>Your sandbox expires automatically after a few days</li>
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
