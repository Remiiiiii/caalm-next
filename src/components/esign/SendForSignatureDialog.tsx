"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EsignResourceType } from "@/lib/esign/types";

/** Thin launcher: the prepare workspace lives on a returnable route. */
export function SendForSignatureDialog({
	open,
	onOpenChange,
	resourceType,
	resourceId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resourceType: EsignResourceType;
	resourceId: string;
	title?: string;
	documentFileId?: string;
	onSent?: () => void;
}) {
	const router = useRouter();

	useEffect(() => {
		if (!open || !resourceId) return;
		onOpenChange(false);
		router.push(`/esign/prepare/${resourceType}/${resourceId}`);
	}, [open, onOpenChange, resourceId, resourceType, router]);

	return null;
}
