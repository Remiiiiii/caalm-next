import { redirect } from "next/navigation";
import { getDashboardHomeRedirectPath } from "@/lib/auth/dashboard-guards";

export const dynamic = "force-dynamic";

type DashboardIndexPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Canonical entry for `/dashboard`: send the user to their role-specific home.
 * Preserve query string (e.g. expiryEntity/expiryId from "Back to alert" / push View).
 */
export default async function DashboardIndexPage({
	searchParams,
}: DashboardIndexPageProps) {
	const path = await getDashboardHomeRedirectPath();
	if (!path) {
		redirect("/sign-in");
	}

	const params = await searchParams;
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params ?? {})) {
		if (typeof value === "string") {
			qs.set(key, value);
		} else if (Array.isArray(value)) {
			for (const entry of value) {
				qs.append(key, entry);
			}
		}
	}
	const query = qs.toString();
	redirect(query ? `${path}?${query}` : path);
}
