"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { STEP_UP_TTL_MS } from "@/lib/auth/step-up-client";

const LOCKOUT_MESSAGE = "Too many attempts. Try again later.";

function formatCountdown(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface StepUpOtpDialogProps {
	open: boolean;
	email: string;
	onVerified: () => void;
	onCancel: () => void;
}

export function StepUpOtpDialog({
	open,
	email,
	onVerified,
	onCancel,
}: StepUpOtpDialogProps) {
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(STEP_UP_TTL_MS / 1000);
	const expiresAtRef = useRef<number | null>(null);
	const requestedRef = useRef(false);

	const startCountdown = useCallback(() => {
		expiresAtRef.current = Date.now() + STEP_UP_TTL_MS;
		setSecondsLeft(Math.ceil(STEP_UP_TTL_MS / 1000));
	}, []);

	useEffect(() => {
		if (!open) {
			requestedRef.current = false;
			setOtp("");
			setError("");
			expiresAtRef.current = null;
			return;
		}

		if (requestedRef.current) return;
		requestedRef.current = true;

		void (async () => {
			try {
				const res = await fetch("/api/auth/step-up/request", {
					method: "POST",
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(
						typeof body.error === "string"
							? body.error
							: "Could not send verification code",
					);
				}
				startCountdown();
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Could not send verification code",
				);
			}
		})();
	}, [open, startCountdown]);

	useEffect(() => {
		if (!open || !expiresAtRef.current || isLoading) return;
		const tick = () => {
			const expiresAt = expiresAtRef.current;
			if (!expiresAt) return;
			setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [open, isLoading]);

	const isExpired = secondsLeft <= 0 && expiresAtRef.current !== null;

	const handleVerify = async () => {
		if (isLoading || isExpired || otp.length !== 6) {
			setError("Enter the 6-digit code from your email");
			return;
		}
		setIsLoading(true);
		setError("");
		try {
			const res = await fetch("/api/auth/step-up/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ otp }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (body.error?.includes("Too many attempts")) {
					setError(LOCKOUT_MESSAGE);
					return;
				}
				throw new Error(
					typeof body.error === "string" ? body.error : "Invalid code",
				);
			}
			onVerified();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid code");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		setIsResending(true);
		setError("");
		setOtp("");
		try {
			const res = await fetch("/api/auth/step-up/request", { method: "POST" });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					typeof body.error === "string"
						? body.error
						: "Could not resend verification code",
				);
			}
			startCountdown();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Could not resend verification code",
			);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
			}}
		>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<ShieldCheck className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Confirm this change
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Enter the code we emailed to {email}. You won&apos;t need to enter it
						again for 5 minutes.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="flex justify-center">
						<InputOTP
							maxLength={6}
							value={otp}
							onChange={setOtp}
							disabled={isLoading || isExpired}
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
					</div>
					{error ? (
						<p className="text-center text-sm text-red" role="alert">
							{error}
						</p>
					) : null}
					<p className="text-center text-xs text-slate-500">
						{isExpired
							? "Code expired."
							: `Code expires in ${formatCountdown(secondsLeft)}`}
					</p>
					<div className="flex justify-center">
						<Button
							type="button"
							variant="outline"
							className="cursor-pointer"
							disabled={isResending}
							onClick={() => void handleResend()}
						>
							Resend code
						</Button>
					</div>
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						disabled={isLoading || isExpired || otp.length !== 6}
						onClick={() => void handleVerify()}
					>
						<ShieldCheck className="h-4 w-4" />
						Verify
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
