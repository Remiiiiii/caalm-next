"use client";

import { useParams } from "next/navigation";
import { EsignPrepareWorkspace } from "@/components/esign/prepare/EsignPrepareWorkspace";

export default function EsignPreparePage() {
	const params = useParams<{ resourceType: string; resourceId: string }>();
	const resourceType = params.resourceType === "license" ? "license" : "contract";
	return (
		<EsignPrepareWorkspace
			resourceType={resourceType}
			resourceId={String(params.resourceId || "")}
		/>
	);
}
