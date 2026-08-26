"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import LicensesBulkBar from "@/components/LicensesBulkBar";
import { applyLicenseFilters } from "@/lib/licenses/applyLicenseFilters";
import {
	matchesStatusTab,
	type LicenseFilters,
} from "@/lib/licenses/licensesListUtils";
import { fetcher } from "@/lib/swr-config";
import type { License } from "@/types/licenses";
import LicensesView, { useLicensesView } from "./LicensesView";

interface LicensesViewClientProps {
	initialLicenses: License[];
	totalCount: number;
	pageSize: number;
	user: {
		role?: string;
	} | null;
}

interface ListResponse {
	data?: { licenses?: License[] };
	meta?: { pagination?: { total: number } };
}

function buildListUrl(
	page: number,
	pageSize: number,
	filters: LicenseFilters,
) {
	const params = new URLSearchParams({
		limit: String(pageSize),
		offset: String((page - 1) * pageSize),
	});
	if (filters.search?.trim()) params.set("search", filters.search.trim());
	if (filters.vendor?.trim()) params.set("vendor", filters.vendor.trim());
	if (filters.licenseType?.trim())
		params.set("licenseType", filters.licenseType.trim());
	if (filters.status?.trim()) params.set("status", filters.status.trim());
	if (filters.department?.trim())
		params.set("department", filters.department.trim());
	if (filters.expiringSoon) params.set("expiringSoon", "true");
	return `/api/licenses?${params.toString()}`;
}

export default function LicensesViewClient({
	initialLicenses,
	totalCount,
	pageSize,
	user,
}: LicensesViewClientProps) {
	const router = useRouter();
	const { filters, statusTab } = useLicensesView();
	const [page, setPage] = useState(1);

	useEffect(() => {
		setPage(1);
	}, [filters, statusTab]);

	const hasActiveFilters = Boolean(
		filters.search?.trim() ||
			filters.vendor?.trim() ||
			filters.licenseType?.trim() ||
			filters.status?.trim() ||
			filters.department?.trim() ||
			filters.expiringSoon,
	);

	const listUrl =
		page === 1 && !hasActiveFilters
			? null
			: buildListUrl(page, pageSize, filters);

	const { data: listData, isLoading: listLoading } = useSWR<ListResponse>(
		listUrl,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 30000 },
	);

	const pageLicenses = useMemo(() => {
		if (page === 1 && !listUrl) return initialLicenses;
		return listData?.data?.licenses ?? [];
	}, [page, listUrl, initialLicenses, listData]);

	const [localLicenses, setLocalLicenses] = useState(pageLicenses);

	useEffect(() => {
		setLocalLicenses(pageLicenses);
	}, [pageLicenses]);

	const handleRefresh = useCallback(() => {
		router.refresh();
	}, [router]);

	const handleLicenseRemoved = (licenseId: string) => {
		setLocalLicenses((prev) => prev.filter((l) => l.$id !== licenseId));
	};

	const filteredLicenses = useMemo(() => {
		return applyLicenseFilters(localLicenses, filters).filter((license) =>
			matchesStatusTab(license, statusTab),
		);
	}, [localLicenses, filters, statusTab]);

	const effectiveTotal = listData?.meta?.pagination?.total ?? totalCount;

	return (
		<>
			{listLoading && page !== 1 ? (
				<div className="py-8 text-center text-sm text-slate-600">
					Loading licenses…
				</div>
			) : (
				<LicensesView
					licenses={filteredLicenses}
					totalCount={effectiveTotal}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					user={user}
					onRefresh={handleRefresh}
					onLicenseRemoved={handleLicenseRemoved}
				/>
			)}
			<LicensesBulkBar licenses={filteredLicenses} />
		</>
	);
}
