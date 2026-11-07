"use client";

import { ArrowLeft, Key } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import LicenseDetailView from "@/components/licenses/LicenseDetailView";
import { LoadingSpinner } from "@/components/ui/loading";
import type { License } from "@/types/licenses";

type LicenseDetailsPageProps = {
	licenseId: string;
};

export default function LicenseDetailsPage({
	licenseId,
}: LicenseDetailsPageProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const fromAlert = searchParams?.get("fromAlert");
	const [license, setLicense] = useState<License | null>(null);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch(`/api/licenses/${licenseId}`);
				if (!response.ok) throw new Error("Failed to load license");
				const json = await response.json();
				if (!cancelled) setLicense(json?.data?.license ?? null);
			} catch {
				if (!cancelled) setNotFound(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [licenseId]);

	if (notFound) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-slate-500">
				This license could not be found.
			</div>
		);
	}

	if (!license) {
		return (
			<div className="flex h-full items-center justify-center">
				<LoadingSpinner size="md" />
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
			<div className="flex shrink-0 flex-col border-b border-slate-200 px-6 pb-4 pt-[22px]">
				<div className="flex items-center gap-2.5">
					{fromAlert && (
						<button
							type="button"
							onClick={() =>
								router.push(
									`/dashboard?expiryEntity=license&expiryId=${licenseId}`,
								)
							}
							className="mr-1 inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#0f5384] transition-colors hover:text-[#078fab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							<ArrowLeft className="h-4 w-4" aria-hidden />
							Back to alert
						</button>
					)}
					<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/15 bg-white text-[#0f5384]">
						<Key className="h-5 w-5" />
					</div>
					<h1 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
						{license.licenseName || "License details"}
					</h1>
				</div>
				<p className="mt-1 pl-11 text-[13px] leading-normal text-slate-500">
					License details
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<LicenseDetailView license={license} />
			</div>
		</div>
	);
}
