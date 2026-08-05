"use client";

import { RefreshCw, Shield } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { forceAuthResetAfterLockout } from "@/lib/actions/user.actions";
import { Button } from "./ui/button";

const LOCKOUT_MESSAGE = "Too many attempts. Sign in again.";

interface TwoFactorVerificationModalProps {
	userId: string;
	email: string;
	onSuccess: () => void;
	onClose: () => void;
}

const TwoFactorVerificationModal = ({
	userId,
	onSuccess,
	onClose,
}: TwoFactorVerificationModalProps) => {
	const [isOpen, setIsOpen] = useState(true);
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [attempts, setAttempts] = useState(0);
	const [isLockedOut, setIsLockedOut] = useState(false);
	const { toast } = useToast();

	const enforceLockout = async () => {
		setIsLockedOut(true);
		setError(LOCKOUT_MESSAGE);
		toast({
			title: "Too many attempts",
			description: LOCKOUT_MESSAGE,
			variant: "destructive",
		});
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
		if (isLockedOut) return;
		if (!otp || otp.length !== 6) {
			setError("Please enter a 6-digit verification code");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("/api/2fa/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId,
					code: otp,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast({
					title: "2FA Verification Successful",
					description: "Welcome back!",
				});
				onSuccess();
				return;
			}

			if (response.status === 429 || data.locked) {
				await enforceLockout();
				return;
			}

			setAttempts((prev) => prev + 1);
			setError(data.error || "Invalid verification code. Please try again.");
		} catch (error) {
			console.error("Failed to verify 2FA", error);
			setError("Failed to verify 2FA. Please try again later.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendCode = async () => {
		toast({
			title: "2FA Code",
			description: "Please check your authenticator app for the current code.",
		});
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogContent className="shad-alert-dialog !max-h-none overflow-hidden">
				<AlertDialogHeader className="relative flex justify-center max-w-full">
					<AlertDialogTitle className="h2 text-center flex items-center gap-2 text-slate-700">
						<Shield className="h-5 w-5 text-blue-500" />
						Two-Factor Authentication
						<Image
							src="/assets/icons/close-dark.svg"
							alt="close"
							width={20}
							height={20}
							className="otp-close-button"
							onClick={() => {
								setIsOpen(false);
								onClose();
							}}
						/>
					</AlertDialogTitle>
					<AlertDialogDescription className="subtitle-2 font-light! text-center">
						Enter the 6-digit code from your authenticator app
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="w-full max-w-full overflow-hidden flex justify-center">
					<InputOTP
						maxLength={6}
						value={otp}
						onChange={setOtp}
						disabled={isLockedOut}
						containerClassName="w-full max-w-full justify-center"
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

				{error && <div className="text-red text-center text-sm">{error}</div>}

				{attempts > 0 && !isLockedOut && (
					<div className="text-orange-600 text-center text-sm">
						Failed attempts: {attempts}/3
					</div>
				)}

				<AlertDialogFooter>
					<div className="flex w-full flex-col gap-4 items-center">
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void handleVerify();
							}}
							className="shad-submit-btn h-12 w-auto px-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							type="button"
							disabled={otp.length !== 6 || isLoading || isLockedOut}
						>
							{isLoading ? (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									Verifying...
								</>
							) : (
								"Verify & Continue"
							)}
						</AlertDialogAction>
						<div className="subtitle-2 mt-2 text-center text-slate-600">
							Need help?
							<Button
								type="button"
								variant="link"
								className="pl-1 text-brand cursor-pointer"
								onClick={handleResendCode}
							>
								Check Authenticator App
							</Button>
						</div>
					</div>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default TwoFactorVerificationModal;
