"use client";

import dynamic from "next/dynamic";

export type FilePreviewDialogFile = {
	name: string;
	url: string;
	type?: string;
	extension?: string;
};

type FilePreviewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: FilePreviewDialogFile | null;
};

const FilePreviewDialogImpl = dynamic(
	() => import("./FilePreviewDialogImpl"),
	{
		ssr: false,
	},
);

export default function FilePreviewDialog(props: FilePreviewDialogProps) {
	return <FilePreviewDialogImpl {...props} />;
}
