"use client";

import { use } from "react";
import { AuditFindingsReview } from "@/components/audit-upload/AuditFindingsReview";

export default function AuditUploadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <AuditFindingsReview documentId={id} />;
}
