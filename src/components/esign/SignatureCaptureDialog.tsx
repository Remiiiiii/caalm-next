"use client";

import { PenLine } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

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
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			icon={<PenLine className="h-5 w-5" />}
			title="Draw signature"
			description="Draw in the box, then continue to apply it to the document."
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button className="btn-primary px-3 sm:px-4" onClick={confirm}>
						<PenLine className="h-4 w-4" />
						Next
					</Button>
				</>
			}
		>
			<div className="pb-1">
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
		</AppDialog>
	);
}
