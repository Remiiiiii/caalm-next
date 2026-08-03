"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";

export default function Page() {
	return (
		<ITPageShell
			title="Access Control"
			subtitle="Roles and permission assignments"
			icon={KeyRound}
		>
			<ITGlassPanel>
				<p className="text-sm text-slate-600 mb-4">
					Manage roles and permissions in the admin roles console.
				</p>
				<div className="flex flex-wrap gap-3">
					<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
						<Link href="/dashboard/admin/roles">Open Role Management</Link>
					</Button>
					<Button asChild variant="outline" className="cursor-pointer">
						<Link href="/dashboard/it/team/roles">IT team roles view</Link>
					</Button>
				</div>
			</ITGlassPanel>
		</ITPageShell>
	);
}
