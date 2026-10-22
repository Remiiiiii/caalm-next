"use client";

import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { UIFileDoc } from "@/types/files";

interface ContractDismissalAcknowledgmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	contract: UIFileDoc;
	onSuccess: () => void;
}

export default function ContractDismissalAcknowledgmentModal({
	isOpen,
	onClose,
	contract,
	onSuccess,
}: ContractDismissalAcknowledgmentModalProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const signatureRef = useRef<SignatureCanvas>(null);
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const [canvasSize, setCanvasSize] = useState({ width: 600, height: 100 });
	const [signatureDate, setSignatureDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [isConfirmed, setIsConfirmed] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Reset form state when modal opens
	useEffect(() => {
		if (isOpen) {
			setIsConfirmed(false);
			setSignatureDate(new Date().toISOString().split("T")[0]);
			if (signatureRef.current) {
				signatureRef.current.clear();
			}
		}
	}, [isOpen]);

	// Calculate canvas dimensions when modal opens
	useEffect(() => {
		if (!isOpen) {
			if (signatureRef.current) {
				signatureRef.current.clear();
			}
			return;
		}

		const updateSize = () => {
			if (canvasContainerRef.current) {
				const rect = canvasContainerRef.current.getBoundingClientRect();
				const width = Math.max(300, Math.floor(rect.width)) || 600;
				if (width !== canvasSize.width) {
					setCanvasSize({ width, height: 100 });
				}
			}
		};

		let observer: MutationObserver | null = null;

		// Update size after modal is open and ensure canvas is interactive
		const timer = setTimeout(() => {
			updateSize();
			if (signatureRef.current) {
				const canvas = signatureRef.current.getCanvas();
				if (canvas) {
					// Add class and force pointer events to be auto - this is critical for drawing
					canvas.classList.add("signature-canvas-interactive");
					canvas.style.setProperty("pointer-events", "auto", "important");
					canvas.style.setProperty("touch-action", "none", "important");
					canvas.style.setProperty("cursor", "crosshair", "important");
					canvas.style.setProperty("user-select", "none", "important");

					// Watch for style changes and re-apply if needed
					observer = new MutationObserver(() => {
						if (canvas.style.pointerEvents === "none") {
							canvas.style.setProperty("pointer-events", "auto", "important");
						}
					});
					observer.observe(canvas, {
						attributes: true,
						attributeFilter: ["style"],
					});

					signatureRef.current.clear();
				}
			}
		}, 300);

		window.addEventListener("resize", updateSize);

		return () => {
			clearTimeout(timer);
			window.removeEventListener("resize", updateSize);
			if (observer) {
				observer.disconnect();
			}
		};
	}, [isOpen, canvasSize.width]);

	const handleClear = () => {
		signatureRef.current?.clear();
	};

	const handleSubmit = async () => {
		if (!signatureRef.current || signatureRef.current.isEmpty()) {
			toast({
				title: "Acknowledgment mark required",
				description: "Please draw your acknowledgment mark before submitting.",
				variant: "destructive",
			});
			return;
		}

		if (!isConfirmed) {
			toast({
				title: "Confirmation required",
				description: "Please confirm you reviewed this expiry alert.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const signatureData = signatureRef.current.toDataURL();
			const contractName =
				contract.contractName || contract.name || "Untitled Contract";

			if (!user?.$id) {
				throw new Error("User not authenticated");
			}

			if (!contract.$id) {
				throw new Error("Contract ID is missing");
			}

			// Dismiss contract (creates audit log and notification)
			const response = await fetch("/api/contracts/dismiss", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: user.$id,
					contractId: contract.$id,
					contractName: contractName,
					signatureData: signatureData,
					signatureDate: signatureDate,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					error: "Failed to dismiss contract",
				}));
				throw new Error(errorData.error || "Failed to dismiss contract");
			}

			const _result = await response.json();

			toast({
				title: "Contract dismissed",
				description: "The contract has been successfully dismissed.",
			});

			// Reset form
			signatureRef.current.clear();
			setIsConfirmed(false);
			setSignatureDate(new Date().toISOString().split("T")[0]);

			onSuccess();
			onClose();
		} catch (error) {
			console.error("Failed to dismiss contract:", error);
			toast({
				title: "Error",
				description: "Failed to dismiss contract. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const isSignatureEmpty = signatureRef.current?.isEmpty() ?? true;
	const canSubmit = !isSignatureEmpty && isConfirmed && !isSubmitting;

	return (
		<AppDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			size="form"
			className="z-[10001] max-h-[90vh] max-w-[600px]"
			pending={isSubmitting}
			icon={<FileText className="h-5 w-5" />}
			title="Acknowledge expiry alert"
			description="This is an internal acknowledgment only. It is not a legal e-signature and does not execute the contract."
			footer={
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={!canSubmit}
					className="primary-btn px-3 sm:px-4"
				>
					{isSubmitting ? "Submitting..." : "Submit"}
				</Button>
			}
		>
						<div className="space-y-6 pb-1">
							{/* Contract Info */}
							<div className="bg-white rounded-lg p-4 border border-slate-200">
								<h3 className="font-semibold text-slate-700 mb-2">
									{contract.contractName ||
										contract.name ||
										"Untitled Contract"}
								</h3>
								{contract.contractExpiryDate && (
									<p className="text-sm text-slate-600">
										Expires:{" "}
										{new Date(contract.contractExpiryDate).toLocaleDateString()}
									</p>
								)}
							</div>

							{/* Signature Canvas */}
							<div className="space-y-2">
								<Label
									htmlFor="signature"
									className="text-sm font-medium text-slate-700"
								>
									Acknowledgment mark
								</Label>
								<div className="bg-white rounded-lg border-2 border-slate-200 p-4">
									<div
										ref={canvasContainerRef}
										className="w-full border border-slate-300 rounded"
										style={{
											height: "100px",
											width: "100%",
											position: "relative",
										}}
									>
										<SignatureCanvas
											ref={signatureRef}
											canvasProps={{
												width: canvasSize.width,
												height: canvasSize.height,
												style: {
													pointerEvents: "auto",
													touchAction: "none",
													cursor: "crosshair",
												},
											}}
											backgroundColor="white"
											penColor="black"
										/>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleClear}
										className="mt-2"
									>
										Clear mark
									</Button>
								</div>
							</div>

							{/* Date Input */}
							<div className="space-y-2">
								<Label
									htmlFor="signatureDate"
									className="text-sm font-medium text-slate-700"
								>
									Date
								</Label>
								<Input
									id="signatureDate"
									type="date"
									value={signatureDate}
									onChange={(e) => setSignatureDate(e.target.value)}
									className="bg-white"
									required
								/>
							</div>

							{/* Confirmation Checkbox */}
							<div className="flex items-start space-x-3 bg-white rounded-lg p-4 border border-slate-200">
								<Checkbox
									id="confirmation"
									checked={isConfirmed}
									onCheckedChange={(checked) =>
										setIsConfirmed(checked === true)
									}
									className="mt-1"
								/>
								<Label
									htmlFor="confirmation"
									className="text-sm text-slate-700 leading-relaxed cursor-pointer"
								>
									I acknowledge I reviewed this expiry alert. This mark is not a
									legal e-signature and does not execute the contract.
								</Label>
							</div>
						</div>
		</AppDialog>
	);
}
