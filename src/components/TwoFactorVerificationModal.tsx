"use client";

import {
	AlertCircle,
	ArrowLeft,
	Clock,
	Key,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { forceAuthResetAfterLockout } from "@/lib/actions/user.actions";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MESSAGE =
	"Too many incorrect attempts. Please sign in again or contact your administrator.";

function maskEmail(email: string): string {
	const [local, domain] = email.split("@");
	if (!local || !domain) return email;
	return `${local[0]}${"•".repeat(Math.min(local.length - 1, 8))}@${domain}`;
}

interface TwoFactorVerificationModalProps {
	userId: string;
	email: string;
	onSuccess: () => void;
	onClose: () => void;
}

const TwoFactorVerificationModal = ({
	userId,
	email,
	onSuccess,
	onClose,
}: TwoFactorVerificationModalProps) => {
	const [isOpen, setIsOpen] = useState(true);
	const [otp, setOtp] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [recoveryMode, setRecoveryMode] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [attempts, setAttempts] = useState(0);
	const [isLockedOut, setIsLockedOut] = useState(false);

	const enforceLockout = async () => {
		setIsLockedOut(true);
		setError(LOCKOUT_MESSAGE);
		try {
			await forceAuthResetAfterLockout();
		} catch {
			// continue redirect
		}
		setIsOpen(false);
		onClose();
		window.location.href = "/sign-in";
	};

	const handleVerify = async () => {
		if (isLockedOut || isLoading) return;
		const code = recoveryMode ? recoveryCode : otp;
		if (code.length < 6) return;

		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("/api/2fa/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, code }),
			});
			const data = await response.json();

			if (data.success) {
				onSuccess();
				return;
			}

			if (response.status === 429 || data.locked) {
				await enforceLockout();
				return;
			}

			const next = attempts + 1;
			setAttempts(next);
			setOtp("");
			setRecoveryCode("");

			if (next >= MAX_ATTEMPTS) {
				await enforceLockout();
				return;
			}

			const attemptsLeft = MAX_ATTEMPTS - next;
			setError(
				`Incorrect code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left. Wait for a new code in your app and try again.`,
			);
		} catch {
			setError("Couldn't verify. Check your connection and try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		onClose();
	};

	const canSubmit = recoveryMode ? recoveryCode.length >= 6 : otp.length === 6;

	return (
		<AppDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
			size="form"
			pending={isLoading || isLockedOut}
			icon={<ShieldCheck className="h-5 w-5" />}
			title="Two-factor authentication"
			description={
				recoveryMode
					? `Enter one of your recovery codes${email ? ` for ${maskEmail(email)}` : ""}.`
					: `Enter the 6-digit code from your authenticator app${email ? ` for ${maskEmail(email)}` : ""}.`
			}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={isLoading}
						onClick={handleClose}
					>
						<ArrowLeft className="h-4 w-4" />
						Back to sign in
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={!canSubmit || isLoading || isLockedOut}
						onClick={() => void handleVerify()}
					>
						{isLoading ? (
							<RefreshCw className="h-4 w-4 animate-spin" />
						) : (
							<ShieldCheck className="h-4 w-4" />
						)}
						{isLoading ? "Verifying…" : "Verify and continue"}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3 pb-1">

				{/* Status slot */}
				<div className="min-h-11">
					{isLockedOut || error ? (
						<div
							role="alert"
							className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
						>
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
							<p className="text-sm text-red-700">{error || LOCKOUT_MESSAGE}</p>
						</div>
					) : !recoveryMode ? (
						<div className="flex items-center gap-1.5 text-sm text-slate-500">
							<Clock className="h-3.5 w-3.5 shrink-0" />
							<span>The code in your app changes every 30 seconds</span>
						</div>
					) : null}
				</div>

				{/* Input */}
				{recoveryMode ? (
					<input
						type="text"
						value={recoveryCode}
						onChange={(e) => {
							setRecoveryCode(e.target.value);
							if (error) setError("");
						}}
						placeholder="Enter recovery code"
						className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-center font-mono text-sm tracking-widest text-slate-700 focus:border-[#078FAB] focus:outline-none"
					/>
				) : (
					<div className="flex justify-center">
						<InputOTP
							maxLength={6}
							value={otp}
							disabled={isLockedOut || isLoading}
							containerClassName="w-full max-w-full justify-center"
							onChange={(value) => {
								setOtp(value);
								if (error) setError("");
							}}
							onComplete={() => {
								if (!isLockedOut) void handleVerify();
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
				)}

				<p className="text-sm text-slate-500">
					{recoveryMode ? (
						<button
							type="button"
							onClick={() => {
								setRecoveryMode(false);
								setRecoveryCode("");
								setError("");
							}}
							className="inline-flex items-center gap-1 text-[#078FAB] hover:underline"
						>
							<ShieldCheck className="h-3.5 w-3.5" />
							Use authenticator code instead
						</button>
					) : (
						<span>
							Lost access to your app?{" "}
							<button
								type="button"
								onClick={() => {
									setRecoveryMode(true);
									setOtp("");
									setError("");
								}}
								className="font-medium text-[#078FAB] hover:underline"
							>
								<Key className="mr-0.5 -mt-0.5 inline h-3 w-3" />
								Use a recovery code
							</button>
						</span>
					)}
				</p>
			</div>
		</AppDialog>
	);
};

export default TwoFactorVerificationModal;
