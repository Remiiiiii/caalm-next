"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { applyLicenseFilters } from "@/lib/licenses/applyLicenseFilters";
import { matchesStatusTab } from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";
import LicensesView, { useLicensesView } from "./LicensesView";

interface LicensesViewClientProps {
	licenses: License[];
	user: {
		role?: string;
	} | null;
}

export default function LicensesViewClient({
	licenses,
	user,
}: LicensesViewClientProps) {
	const router = useRouter();
	const { filters, statusTab } = useLicensesView();

	const handleRefresh = () => {
		router.refresh();
	};

	const filteredLicenses = useMemo(() => {
		return applyLicenseFilters(licenses, filters).filter((license) =>
			matchesStatusTab(license, statusTab),
		);
	}, [licenses, filters, statusTab]);

	return (
		<LicensesView
			licenses={filteredLicenses}
			user={user}
			onRefresh={handleRefresh}
		/>
	);
}
