"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
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
import { Button } from "./ui/button";

const OTP_TTL_MS = 5 * 60 * 1000;
const LOCKOUT_MESSAGE = "Too many attempts. Sign in again.";

function formatCountdown(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function handleLockoutAndRedirect() {
	try {
		await forceAuthResetAfterLockout();
	} catch {
		// continue to sign-in even if cookie clear fails
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
	const [internalIsOpen, setInternalIsOpen] = useState(true);
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [attempts, setAttempts] = useState(0);
	const [lastError, setLastError] = useState("");
	const [isLockedOut, setIsLockedOut] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [hasAutoSent, setHasAutoSent] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(5 * 60);
	const hasAutoSentRef = useRef(false);
	const expiresAtRef = useRef<number | null>(null);

	// Use parent-controlled isOpen prop
	const modalIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;

	const startCountdown = () => {
		expiresAtRef.current = Date.now() + OTP_TTL_MS;
		setSecondsLeft(Math.ceil(OTP_TTL_MS / 1000));
	};

	// Start countdown when modal opens (OTP already sent by signInUser)
	useEffect(() => {
		if (modalIsOpen && email && !hasAutoSentRef.current) {
			setHasAutoSent(true);
			hasAutoSentRef.current = true;
			startCountdown();
		}
	}, [modalIsOpen, email]);

	// Tick every second while the modal is open (pause while verifying)
	useEffect(() => {
		if (!modalIsOpen || !expiresAtRef.current || isLoading) return;

		const tick = () => {
			const expiresAt = expiresAtRef.current;
			if (!expiresAt) return;
			const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
			setSecondsLeft(remaining);
		};

		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [modalIsOpen, hasAutoSent, isLoading]);

	const handleVerify = async () => {
		if (isLockedOut || isExpired || isLoading) return;
		setIsLoading(true);
		setError("");
		setLastError("");

		try {
			const res = await verifyOTP({ email, otp, accountId });
			if (res?.success) {
				// Freeze client countdown so "expired" cannot flash while redirecting
				expiresAtRef.current = null;
				await onSuccess();
				return;
			}

			setAttempts((prev) => prev + 1);
			setError("Invalid OTP. Try again.");
			setLastError("Invalid OTP. Try again.");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to verify OTP. Please try again later.";

			if (message.includes("Too many attempts")) {
				setIsLockedOut(true);
				setError(LOCKOUT_MESSAGE);
				setLastError(LOCKOUT_MESSAGE);
				if (onError) onError(LOCKOUT_MESSAGE);
				await handleLockoutAndRedirect();
				return;
			}

			setError(message);
			setLastError(message);
			if (onError) {
				onError(message);
			}
			setAttempts((prev) => prev + 1);
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendOtp = async () => {
		if (isLockedOut) return;
		setIsResending(true);
		try {
			setError("");
			setLastError("");
			await sendEmailOTP({ email });
			startCountdown();
			setAttempts(0);
			setOtp("");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to resend verification code. Please try again.";
			if (message.includes("Too many attempts")) {
				setIsLockedOut(true);
				setError(LOCKOUT_MESSAGE);
				setLastError(LOCKOUT_MESSAGE);
				await handleLockoutAndRedirect();
				return;
			}
			setError(message);
			setLastError(message);
		} finally {
			setIsResending(false);
		}
	};

	const handleModalClose = (open: boolean) => {
		if (!open) {
			setError("");
			setLastError("");
			setOtp("");
			setAttempts(0);
			setHasAutoSent(false);
			hasAutoSentRef.current = false;
			expiresAtRef.current = null;
			setSecondsLeft(5 * 60);

			if (onClose) {
				onClose();
			} else {
				setInternalIsOpen(false);
			}
		}
	};

	const isExpired = !isLoading && hasAutoSent && secondsLeft <= 0;

	return (
		<AlertDialog open={modalIsOpen} onOpenChange={handleModalClose}>
			<AlertDialogContent className="shad-alert-dialog !max-h-none overflow-hidden">
				<AlertDialogHeader className="relative flex justify-center max-w-full">
					<AlertDialogTitle className="h2 text-center text-slate-700">
						Enter Your OTP
						<Image
							src="/assets/icons/close-dark.svg"
							alt="close"
							width={20}
							height={20}
							className="otp-close-button"
							onClick={() => {
								if (onClose) {
									onClose();
								} else {
									setInternalIsOpen(false);
								}
							}}
						/>
					</AlertDialogTitle>
					<AlertDialogDescription className="subtitle-2 text-center break-all px-1 max-w-full">
						<span className="text-lg text-slate-700">
							{hasAutoSent
								? `Enter the verification code sent to`
								: `Sending verification code to`}
						</span>
						<span className="block font-light text-slate-900">{email}</span>
					</AlertDialogDescription>
					{hasAutoSent ? (
						<p
							className={`mt-2 text-center text-sm font-medium tabular-nums transition-colors duration-200 ${
								isLoading
									? "text-slate-600"
									: isExpired
										? "text-brand"
										: secondsLeft <= 60
											? "text-brand"
											: "text-slate-600"
							}`}
							aria-live="polite"
						>
							{isLoading
								? "Verifying code…"
								: isExpired
									? "Code expired. Request a new one."
									: `Code expires in ${formatCountdown(secondsLeft)}`}
						</p>
					) : null}
				</AlertDialogHeader>
				<div className="w-full max-w-full overflow-hidden flex justify-center">
					<InputOTP
						maxLength={6}
						value={otp}
						disabled={isExpired || isLockedOut}
						containerClassName="w-full max-w-full justify-center"
						onChange={(value) => {
							setOtp(value);
							// Clear errors when user starts typing
							if (value.length > 0 && (error || lastError)) {
								setError("");
								setLastError("");
							}
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

				{(error || lastError) && (
					<div
						className={`text-center p-3 rounded-lg mb-4 ${
							(error || lastError).includes("sent!")
								? "text-green-500 bg-green-50 border border-green-200"
								: "text-red bg-red-50 border border-red-200"
						}`}
					>
						<p
							className={`text-sm font-medium ${
								(error || lastError).includes("sent!")
									? "text-green-800"
									: "text-red-800"
							}`}
						>
							{error || lastError}
						</p>
						{!(error || lastError).includes("sent!") && (
							<div className="mt-2 flex flex-col gap-2">
								{(error || lastError).includes("expired") && (
									<button
										onClick={handleResendOtp}
										disabled={isResending}
										className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isResending
											? "Sending..."
											: "Request new verification code"}
									</button>
								)}
								<button
									onClick={() => {
										setError("");
										setLastError("");
										setOtp(""); // Clear the OTP input
									}}
									className="text-xs text-red-600 hover:text-red-800 underline"
								>
									Clear error and try again
								</button>
							</div>
						)}
					</div>
				)}

				{attempts > 0 && (
					<div className="text-orange-600 text-center text-sm">
						Failed attempts: {attempts}/3
					</div>
				)}

				<AlertDialogFooter>
					<div className="flex w-full flex-col gap-4">
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								if (isExpired) return;
								void handleVerify();
							}}
							className="shad-submit-btn h-12 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							type="button"
							disabled={isExpired || isLoading || isLockedOut}
						>
							Submit
							{isLoading && (
								<Image
									src="/assets/icons/loader.svg"
									alt="loader"
									width={24}
									height={24}
									className="ml-2 animate-spin"
								/>
							)}
						</AlertDialogAction>
						<div className="subtitle-2 mt-2 text-center text-slate-600">
							{isExpired ? "Need a new code?" : "Didn't get a code?"}
							<Button
								type="button"
								variant="link"
								className="pl-1 text-brand cursor-pointer transition-colors duration-200"
								onClick={handleResendOtp}
								disabled={isResending}
							>
								{isResending ? "Sending..." : "Resend Code"}
							</Button>
						</div>
					</div>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default OTPModal;
