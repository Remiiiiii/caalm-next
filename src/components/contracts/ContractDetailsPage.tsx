"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ContractPreviewSheet from "@/components/contracts/ContractPreviewSheet";
import type { UIFileDoc } from "@/types/files";

type ContractDetailsPageProps = {
	file: UIFileDoc;
};

export default function ContractDetailsPage({
	file,
}: ContractDetailsPageProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const fromAlert = searchParams?.get("fromAlert");

	return (
		<div className="h-full min-h-0">
			<ContractPreviewSheet
				file={file}
				backLabel={fromAlert ? "Back to alert" : undefined}
				onBack={
					fromAlert
						? () =>
								router.push(
									`/dashboard?expiryEntity=contract&expiryId=${file.$id}`,
								)
						: undefined
				}
			/>
		</div>
	);
}
