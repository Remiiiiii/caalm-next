"use client";

import {
	AlertCircle,
	ArrowLeft,
	Clock,
	Mail,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogContent,
} from "@/components/ui/alert-dialog";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import {
	forceAuthResetAfterLockout,
	sendEmailOTP,
	verifyOTP,
} from "@/lib/actions/user.actions";

const OTP_TTL_SECS = 5 * 60;
const RESEND_COOLDOWN_SECS = 30;
const LOCKOUT_MESSAGE = "Too many attempts. Sign in again.";

function formatTime(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function maskEmail(email: string): string {
	const [local, domain] = email.split("@");
	if (!local || !domain) return email;
	return `${local[0]}${"•".repeat(Math.min(local.length - 1, 8))}@${domain}`;
}

async function handleLockoutAndRedirect() {
	try {
		await forceAuthResetAfterLockout();
	} catch {
		// continue redirect
	}
	window.location.href = "/sign-in";
}

const OTPModal = ({
	accountId,
	email,
	onSuccess,
	onClose,
	onError,
	isOpen = true,
}: {
	accountId?: string;
	email: string;
	onSuccess: () => void;
	onClose?: () => void;
	onError?: (error: string) => void;
	isOpen?: boolean;
}) => {
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [attempts, setAttempts] = useState(0);
	const [isLockedOut, setIsLockedOut] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECS);
	const [resendCooldown, setResendCooldown] = useState(0);
	const expiresAtRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);
	const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const startCountdown = () => {
		expiresAtRef.current = Date.now() + OTP_TTL_SECS * 1000;
		setSecondsLeft(OTP_TTL_SECS);
	};

	const startResendCooldown = () => {
		setResendCooldown(RESEND_COOLDOWN_SECS);
		if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
		resendIntervalRef.current = setInterval(() => {
			setResendCooldown((prev) => {
				if (prev <= 1) {
					clearInterval(resendIntervalRef.current!);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	useEffect(() => {
		if (isOpen && email && !hasStartedRef.current) {
			hasStartedRef.current = true;
			setHasStarted(true);
			startCountdown();
			startResendCooldown();
		}
	}, [isOpen, email]);

	useEffect(() => {
		if (!isOpen || !expiresAtRef.current || isLoading) return;
		const tick = () => {
			const expiresAt = expiresAtRef.current;
			if (!expiresAt) return;
			setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [isOpen, hasStarted, isLoading]);

	useEffect(() => {
		return () => {
			if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
		};
	}, []);

	const isExpired = !isLoading && hasStarted && secondsLeft <= 0;
	const isWarning = secondsLeft <= 60 && secondsLeft > 0;
	const progressPct = Math.max(0, (secondsLeft / OTP_TTL_SECS) * 100);

	const handleVerify = async () => {
		if (isLockedOut || isExpired || isLoading || otp.length !== 6) return;
		setIsLoading(true);
		setError("");
		try {
			const res = await verifyOTP({ email, otp, accountId });
			if (res?.success) {
				expiresAtRef.current = null;
				await onSuccess();
				return;
			}
			setAttempts((prev) => prev + 1);
			setOtp("");
			setError("Incorrect code. Please try again.");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to verify. Please try again.";
			if (message.includes("Too many attempts")) {
				setIsLockedOut(true);
				setError(LOCKOUT_MESSAGE);
				onError?.(LOCKOUT_MESSAGE);
				await handleLockoutAndRedirect();
				return;
			}
			setOtp("");
			setError(message);
			setAttempts((prev) => prev + 1);
			onError?.(message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		if (isLockedOut || resendCooldown > 0 || isResending) return;
		setIsResending(true);
		setError("");
		try {
			await sendEmailOTP({ email });
			startCountdown();
			startResendCooldown();
			setAttempts(0);
			setOtp("");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to resend code.";
			if (message.includes("Too many attempts")) {
				setIsLockedOut(true);
				setError(LOCKOUT_MESSAGE);
				await handleLockoutAndRedirect();
				return;
			}
			setError(message);
		} finally {
			setIsResending(false);
		}
	};

	const handleClose = () => {
		if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
		onClose?.();
	};

	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<AlertDialogContent className="shad-alert-dialog max-h-none!">
				{/* Icon */}
				<div className="flex justify-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#078FAB]/10 ring-2 ring-[#078FAB]/20">
						<Mail className="h-6 w-6 text-[#0f5384]" />
					</div>
				</div>

				{/* Title hierarchy */}
				<div className="text-center space-y-1">
					<h2 className="text-2xl font-bold text-slate-900">
						Enter verification code
					</h2>
					<p className="text-sm text-slate-500">
						Enter the 6-digit code we sent to
					</p>
					<p className="text-sm font-semibold text-slate-700">
						{maskEmail(email)}
					</p>
				</div>

				{/* Status slot — fixed min-height prevents layout shift */}
				<div className="min-h-11">
					{isExpired ? (
						<div
							role="alert"
							className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
						>
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
							<div>
								<p className="text-sm font-semibold text-red-700">
									This code has expired
								</p>
								<p className="mt-0.5 text-xs text-slate-500">
									Request a new one to continue. The old code no longer works.
								</p>
							</div>
						</div>
					) : error ? (
						<div
							role="alert"
							className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
						>
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
							<p className="text-sm text-red-700">
								{error}
								{attempts > 0 && attempts < 3 && (
									<span className="ml-1 font-medium">
										{3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} left.
									</span>
								)}
							</p>
						</div>
					) : hasStarted ? (
						<div className="space-y-1.5">
							<div
								className="flex items-center gap-1.5 text-sm text-slate-500"
								aria-live="polite"
								role="timer"
							>
								<Clock className="h-3.5 w-3.5" />
								<span>
									Code expires in{" "}
									<strong className="tabular-nums text-slate-700">
										{formatTime(secondsLeft)}
									</strong>
								</span>
							</div>
							<div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
								<div
									className="h-full rounded-full transition-[width] duration-1000"
									style={{
										width: `${progressPct}%`,
										backgroundColor: isWarning ? "#f59e0b" : "#078FAB",
									}}
								/>
							</div>
						</div>
					) : null}
				</div>

				{/* OTP Boxes */}
				<div className="flex justify-center">
					<InputOTP
						maxLength={6}
						value={otp}
						disabled={isExpired || isLockedOut || isLoading}
						containerClassName="w-full max-w-full justify-center"
						onChange={(value) => {
							setOtp(value);
							if (value.length > 0 && error) setError("");
						}}
						onComplete={() => {
							if (!isExpired && !isLockedOut) void handleVerify();
						}}
					>
						<InputOTPGroup className="shad-otp">
							<InputOTPSlot index={0} className="shad-otp-slot" />
							<InputOTPSlot index={1} className="shad-otp-slot" />
							<InputOTPSlot index={2} className="shad-otp-slot" />
							<InputOTPSlot index={3} className="shad-otp-slot" />
							<InputOTPSlot index={4} className="shad-otp-slot" />
							<InputOTPSlot index={5} className="shad-otp-slot" />
						</InputOTPGroup>
					</InputOTP>
				</div>

				{/* Primary action */}
				{isExpired ? (
					<button
						type="button"
						onClick={handleResend}
						disabled={isResending}
						className="btn-primary h-11 disabled:opacity-50"
					>
						{isResending ? (
							<>
								<RefreshCw className="h-4 w-4 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<RefreshCw className="h-4 w-4" />
								Send new code
							</>
						)}
					</button>
				) : (
					<button
						type="button"
						onClick={() => void handleVerify()}
						disabled={otp.length !== 6 || isLoading || isLockedOut}
						className="btn-primary h-11 disabled:opacity-50"
					>
						{isLoading ? (
							<>
								<RefreshCw className="h-4 w-4 animate-spin" />
								Verifying...
							</>
						) : (
							<>
								<ShieldCheck className="h-4 w-4" />
								Verify
							</>
						)}
					</button>
				)}

				{/* Footer */}
				<div className="flex flex-col items-center gap-2 text-sm text-slate-500">
					{!isExpired && (
						<span>
							Didn't get a code?{" "}
							{resendCooldown > 0 ? (
								<span className="text-slate-400">
									Resend in {formatTime(resendCooldown)}
								</span>
							) : (
								<button
									type="button"
									onClick={handleResend}
									disabled={isResending}
									className="font-medium text-[#078FAB] hover:underline disabled:opacity-50"
								>
									{isResending ? "Sending..." : "Resend code"}
								</button>
							)}
						</span>
					)}
					<button
						type="button"
						onClick={handleClose}
						className="flex items-center gap-1 text-[#078FAB] hover:underline"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to sign in
					</button>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default OTPModal;
