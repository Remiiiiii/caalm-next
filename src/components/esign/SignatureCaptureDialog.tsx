"use client";

import { PenLine } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function SignatureCaptureDialog({
	open,
	onOpenChange,
	onCapture,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCapture: (dataUrl: string) => void;
}) {
	const canvasRef = useRef<SignatureCanvas>(null);
	const [emptyError, setEmptyError] = useState(false);

	const confirm = () => {
		if (canvasRef.current?.isEmpty()) {
			setEmptyError(true);
			return;
		}
		const dataUrl = canvasRef.current?.toDataURL("image/png") || "";
		onCapture(dataUrl);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<PenLine className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Draw signature
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Draw in the box, then continue to apply it to the document.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<div className="rounded-lg border-[0.25px] border-slate-300 bg-white">
						<SignatureCanvas
							ref={canvasRef}
							canvasProps={{
								width: 520,
								height: 180,
								className: "signature-canvas-interactive w-full",
							}}
						/>
					</div>
					{emptyError ? (
						<p className="mt-2 text-sm text-red">Draw a signature first.</p>
					) : null}
					<button
						type="button"
						className="mt-3 text-sm text-slate-500 hover:text-slate-700"
						onClick={() => {
							canvasRef.current?.clear();
							setEmptyError(false);
						}}
					>
						Clear Signature
					</button>
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button className="primary-btn px-3 sm:px-4" onClick={confirm}>
						<PenLine className="h-4 w-4" />
						Next
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
