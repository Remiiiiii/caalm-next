"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";

export default function Page() {
	return (
		<ITPageShell title="Security Compliance" subtitle="Compliance posture and control status" icon={ShieldCheck}>
			<ITGlassPanel>
				<p className="text-sm text-slate-600 mb-4">
					Compliance status and controls live in the Audits module.
				</p>
				<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
					<Link href="/audits/status">Open Compliance Status</Link>
				</Button>
			</ITGlassPanel>
		</ITPageShell>
	);
}
