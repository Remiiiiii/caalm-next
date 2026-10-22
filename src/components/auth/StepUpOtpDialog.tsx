"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
					err instanceof Error
						? err.message
						: "Could not send verification code",
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
				err instanceof Error
					? err.message
					: "Could not resend verification code",
			);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
			}}
			size="form"
			pending={isLoading}
			icon={<ShieldCheck className="h-5 w-5" />}
			title="Confirm this change"
			description={`Enter the code we emailed to ${email}. You won't need to enter it again for 5 minutes.`}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={isLoading}
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={isLoading || isExpired || otp.length !== 6}
						onClick={() => void handleVerify()}
					>
						<ShieldCheck className="h-4 w-4" />
						{isLoading ? "Verifying…" : "Verify"}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3 pb-1">
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
					<p className="text-sm text-red" role="alert">
						{error}
					</p>
				) : null}
				<p className="text-sm text-slate-500">
					{isExpired
						? "Code expired."
						: `Code expires in ${formatCountdown(secondsLeft)}`}
				</p>
				<div>
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
		</AppDialog>
	);
}
