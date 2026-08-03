"use client";

import { Loader2 } from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import DocumentViewer from "@/components/DocumentViewer";

import FilePreviewDialog from "@/components/files/FilePreviewDialog";

import { Button } from "@/components/ui/button";

import {
	getFilePreviewKind,
	usesMediaPreview,
} from "@/lib/files/filePreviewKind";

type SharedFilePayload = {
	$id: string;

	name: string;

	type: string;

	extension?: string;

	size: number;

	url: string;

	$createdAt: string;

	contractExpiryDate?: string | null;

	description?: string;

	owner?: string | null;
};

export default function SharedFileViewerPage() {
	const params = useParams<{ fileId: string }>();

	const router = useRouter();

	const fileId = params?.fileId;

	const [file, setFile] = useState<SharedFilePayload | null>(null);

	const [error, setError] = useState<string | null>(null);

	const [loading, setLoading] = useState(true);

	const [viewerOpen, setViewerOpen] = useState(true);

	useEffect(() => {
		if (!fileId) return;

		let cancelled = false;

		const load = async () => {
			setLoading(true);

			setError(null);

			try {
				const res = await fetch(`/api/files/shared/${fileId}`);

				if (!res.ok) {
					const body = await res.json().catch(() => ({}));

					throw new Error(body.error || "Unable to open this document");
				}

				const data = (await res.json()) as SharedFilePayload;

				if (!cancelled) {
					setFile(data);

					setViewerOpen(true);
				}
			} catch (err) {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : "Unable to open document",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [fileId]);

	const previewKind = useMemo(
		() =>
			file
				? getFilePreviewKind({
						name: file.name,

						type: file.type,

						extension: file.extension,
					})
				: "document",

		[file],
	);

	const useSimplePreview = usesMediaPreview(previewKind);

	const handleClose = () => {
		setViewerOpen(false);

		router.back();
	};

	if (loading) {
		return (
			<div className="flex min-h-[50vh] w-full items-center justify-center gap-2 px-4">
				<Loader2 className="h-5 w-5 animate-spin text-[#0f5384]" />
				<p className="text-sm text-slate-600">Opening document...</p>
			</div>
		);
	}

	if (error || !file) {
		return (
			<div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
				<p className="text-slate-700">{error || "Document not found"}</p>
				<Button
					type="button"
					className="primary-btn px-4"
					onClick={() => router.push("/uploads")}
				>
					Back to uploads
				</Button>
			</div>
		);
	}

	if (useSimplePreview) {
		return (
			<FilePreviewDialog
				open={viewerOpen}
				onOpenChange={(open) => {
					if (!open) handleClose();
				}}
				file={{
					name: file.name,

					url: file.url,

					type: file.type,

					extension: file.extension,
				}}
			/>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<DocumentViewer
				isOpen={viewerOpen}
				onClose={handleClose}
				file={{
					id: file.$id,

					name: file.name,

					type: file.extension || file.type || "pdf",

					size: String(file.size ?? "Unknown"),

					url: file.url,

					createdAt: file.$createdAt,

					expiresAt: file.contractExpiryDate || undefined,

					createdBy: file.owner || "Unknown",

					description: file.description || "",
				}}
			/>
		</div>
	);
}
