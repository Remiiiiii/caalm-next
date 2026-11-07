import type { Metadata } from "next";
import LicenseDetailsPage from "@/components/licenses/LicenseDetailsPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "License details | CAALM",
	description: "License details for a single license.",
};

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePagePermission(PERMISSIONS.LICENSES.VIEW);
	const { id } = await params;

	return <LicenseDetailsPage licenseId={id} />;
}
