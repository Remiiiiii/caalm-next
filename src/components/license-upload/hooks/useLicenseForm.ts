/**
 * Hook for license form initialization and file processing
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { type LicenseUploadFormData, licenseUploadSchema } from "../schema";
import type { ProcessedFileData } from "../types";

export function useLicenseForm() {
	const form = useForm<LicenseUploadFormData>({
		resolver: zodResolver(licenseUploadSchema) as any,
		mode: "onSubmit",
		defaultValues: {
			licenseName: "",
			licenseNumber: "",
			licenseType: "subscription",
			category: "saas",
			status: "pending-review",
			licenseExpiryDate: undefined,
			issueDate: undefined,
			renewalDate: undefined,
			issuingAuthority: "",
			vendor: "",
			product: "",
			description: "",
			notes: "",
			quantity: "",
			cost: "",
			currencyCode: "USD",
			division: "",
			department: "",
			subDepartment: "",
			businessUnit: "",
			compliance: undefined,
			assignedManagers: [],
			autoRenew: false,
			renewalNoticeDays: "",
		},
	});

	const processFileSynchronously = useCallback(
		(
			file: File,
			onProgress?: (percent: number) => void,
		): Promise<ProcessedFileData> => {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();

				reader.onprogress = (event) => {
					if (event.lengthComputable && event.total > 0) {
						onProgress?.(Math.round((event.loaded / event.total) * 100));
					}
				};

				reader.onload = (event) => {
					try {
						onProgress?.(100);
						const arrayBuffer = event.target?.result as ArrayBuffer;
						const base64Content = btoa(
							new Uint8Array(arrayBuffer).reduce(
								(data, byte) => data + String.fromCharCode(byte),
								"",
							),
						);

						const processedData: ProcessedFileData = {
							name: file.name,
							type: file.type,
							size: file.size,
							base64Content,
							arrayBuffer,
							lastModified: file.lastModified,
						};

						resolve(processedData);
					} catch (error) {
						reject(error);
					}
				};

				reader.onerror = () => reject(new Error("File reading failed"));
				reader.readAsArrayBuffer(file);
			});
		},
		[],
	);

	const extractLicenseData = useCallback(
		async (
			processedData: ProcessedFileData,
		): Promise<Record<string, unknown> | null> => {
			try {
				const response = await fetch("/api/licenses/extract-data", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fileName: processedData.name,
						fileType: processedData.type,
						fileSize: processedData.size,
						fileContent: processedData.base64Content,
					}),
				});

				if (!response.ok) {
					throw new Error("Extraction failed");
				}

				const result = await response.json();
				if (result.success && result.data) {
					return result.data as Record<string, unknown>;
				}
				return null;
			} catch (error) {
				console.error("License extraction error:", error);
				return null;
			}
		},
		[],
	);

	return {
		form,
		processFileSynchronously,
		extractLicenseData,
	};
}
