"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import {
	getEnterpriseDropzoneAccept,
	getEnterpriseFormatHint,
} from "@/lib/files/enterprise-file-formats";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import { MAX_FILE_SIZE } from "../../constants";
import Thumbnail from "./Thumbnail";

interface Props {
	ownerId: string;
	accountId: string;
	className?: string;
}

const FileUploader = ({ ownerId, accountId, className }: Props) => {
	const path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const [files, setFiles] = useState<File[]>([]);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			setFiles(acceptedFiles);

			const uploadPromises = acceptedFiles.map(async (file) => {
				if (file.size > MAX_FILE_SIZE) {
					setFiles((prevFiles) =>
						prevFiles.filter((f) => f.name !== file.name),
					);

					return toast({
						description: (
							<p className="body-2 text-white">
								<span className="font-semibold">{file.name}</span> is too large.
								Max file size is 50MB.
							</p>
						),
						className: "error-toast",
					});
				}

				return uploadFile({ file, ownerId, accountId, path: path || "/" }).then(
					(uploadedFile) => {
						if (uploadedFile) {
							setFiles((prevFiles) =>
								prevFiles.filter((f) => f.name !== file.name),
							);
						}
					},
				);
			});

			await Promise.all(uploadPromises);
			await refreshStorageUsage(router);
		},
		[ownerId, accountId, path, router, toast],
	);

	const { getRootProps, getInputProps } = useDropzone({
		onDrop,
		accept: getEnterpriseDropzoneAccept("generalDocument"),
		onDropRejected: () => {
			toast({
				variant: "destructive",
				title: "File type not allowed",
				description: getEnterpriseFormatHint("generalDocument"),
			});
		},
	});

	const handleRemoveFile = (
		e: React.MouseEvent<HTMLImageElement, MouseEvent>,
		fileName: string,
	) => {
		e.stopPropagation();
		setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
	};

	return (
		<div {...getRootProps()} className="cursor-pointer">
			<input {...getInputProps()} />
			<Button type="button" className={cn(className)}>
				<Image
					src="/assets/icons/upload.svg"
					alt="upload"
					width={16}
					height={16}
				/>
				<span>Upload</span>
			</Button>
			{files.length > 0 && (
				<ul className="uploader-preview-list">
					<h4 className="h4 text-light-100">Uploading...</h4>
					{files.map((file, index) => {
						const { type, extension } = getFileType(file.name);

						return (
							<li
								key={`${file.name}-${index}`}
								className="uploader-preview-item"
							>
								<div className="flex items-center gap-3">
									<Thumbnail
										type={type}
										extension={extension}
										url={convertFileToUrl(file)}
									/>

									<div className="preview-item-name">
										{file.name}
										<Image
											src="/assets/icons/file-loader.gif"
											width={80}
											height={26}
											alt="Loader"
										/>
									</div>
								</div>
								<Image
									src="/assets/icons/remove.svg"
									alt="remove"
									width={24}
									height={24}
									className="cursor-pointer"
									onClick={(e) => handleRemoveFile(e, file.name)}
								/>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};

export default FileUploader;
