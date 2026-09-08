import type { Metadata } from "next";
import { NegotiationWorkspace } from "@/components/contracts/negotiation/NegotiationWorkspace";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Negotiate contract | CAALM",
	description: "Version, comment, and redline a contract draft before review.",
};

export default async function NegotiateContractPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePagePermission(PERMISSIONS.CONTRACTS.VIEW);
	const { id } = await params;
	return <NegotiationWorkspace contractId={id} />;
}
