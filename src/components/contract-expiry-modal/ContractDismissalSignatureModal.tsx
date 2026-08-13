"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Ban, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractDismissalSignatureModalProps {
	isOpen: boolean;
	onClose: () => void;
	contract: UIFileDoc;
	onSuccess: () => void;
}

export default function ContractDismissalSignatureModal({
	isOpen,
	onClose,
	contract,
	onSuccess,
}: ContractDismissalSignatureModalProps) {
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
				title: "Signature required",
				description: "Please provide your signature before submitting.",
				variant: "destructive",
			});
			return;
		}

		if (!isConfirmed) {
			toast({
				title: "Confirmation required",
				description: "Please confirm that the signature is yours.",
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
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogPortal>
				<DialogOverlay className="z-[10000]" />
				<DialogPrimitive.Content
					className={cn(
						"fixed left-[50%] top-[50%] z-[10001] w-full max-w-[600px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 max-h-[90vh] flex flex-col overflow-hidden border-slate-200 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
					)}
				>
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header with gradient background */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<FileText className="w-5 h-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Dismiss Contract Alert
								</DialogTitle>
							</div>
						</div>
						<p className="text-sm text-slate-600 mt-1 ml-14">
							Please provide your signature and confirmation to dismiss this
							alert
						</p>
					</div>

					{/* Scrollable Content */}
					<div
						className="flex-1 overflow-y-auto p-6 bg-slate-50"
						style={{ pointerEvents: "auto" }}
					>
						<div className="space-y-6">
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
									Electronic Signature
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
										Clear Signature
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
									I hereby confirm that I am the sole author of this signature
									and it was executed by me
								</Label>
							</div>
						</div>
					</div>

					{/* Professional Footer */}
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500"></div>
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								onClick={onClose}
								disabled={isSubmitting}
								className="primary-btn px-3 sm:px-4"
							>
								<Ban className="w-4 h-4" />
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!canSubmit}
								className="primary-btn px-3 sm:px-4"
							>
								{isSubmitting ? "Submitting..." : "Submit"}
							</Button>
						</div>
					</div>
					<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
