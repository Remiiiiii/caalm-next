"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
	const [localLicenses, setLocalLicenses] = useState(licenses);

	useEffect(() => {
		setLocalLicenses(licenses);
	}, [licenses]);

	const handleRefresh = () => {
		router.refresh();
	};

	const handleLicenseRemoved = (licenseId: string) => {
		setLocalLicenses((prev) => prev.filter((l) => l.$id !== licenseId));
	};

	const filteredLicenses = useMemo(() => {
		return applyLicenseFilters(localLicenses, filters).filter((license) =>
			matchesStatusTab(license, statusTab),
		);
	}, [localLicenses, filters, statusTab]);

	return (
		<LicensesView
			licenses={filteredLicenses}
			user={user}
			onRefresh={handleRefresh}
			onLicenseRemoved={handleLicenseRemoved}
		/>
	);
}
