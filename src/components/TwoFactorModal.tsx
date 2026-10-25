"use client";

import {
	ArrowLeft,
	ClipboardCopy,
	RefreshCw,
	ShieldCheck,
	Smartphone,
} from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorModalProps {
	email: string;
	userId: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const SETUP_STEPS = [
	{
		title: "Get an authenticator app",
		desc: "Use an app like Google Authenticator or Authy on your phone.",
	},
	{
		title: "Scan the QR code",
		desc: "This links your CAALM account to the app.",
	},
	{
		title: "Confirm with a 6-digit code",
		desc: "Then save your recovery codes in case you lose your phone.",
	},
];

const TwoFactorModal = ({
	userId,
	isOpen,
	onClose,
	onSuccess,
}: TwoFactorModalProps) => {
	const [step, setStep] = useState<"intro" | "scan" | "success">("intro");
	const [isLoading, setIsLoading] = useState(false);
	const [qrCode, setQrCode] = useState("");
	const [secret, setSecret] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [factorId, setFactorId] = useState("");
	const [setupError, setSetupError] = useState("");
	const [scanError, setScanError] = useState("");
	const { toast } = useToast();

	const setupTwoFactor = async () => {
		setIsLoading(true);
		setSetupError("");
		try {
			const response = await fetch("/api/2fa/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});
			const data = await response.json();

			if (data.success) {
				setQrCode(data.data.uri);
				setSecret(data.data.secret);
				setFactorId(data.data.factorId);
				setStep("scan");
			} else {
				throw new Error(data.error);
			}
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message.includes("Server configuration")
						? "Server configuration issue. Please contact support."
						: err.message.includes("User ID")
							? "User information missing. Please refresh and try again."
							: "Failed to start setup. Please try again."
					: "Failed to start setup. Please try again.";
			setSetupError(msg);
		} finally {
			setIsLoading(false);
		}
	};

	const verifyTwoFactor = async () => {
		if (verificationCode.length !== 6) return;
		setIsLoading(true);
		setScanError("");
		try {
			const response = await fetch("/api/2fa/setup", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ factorId, code: verificationCode }),
			});
			const data = await response.json();

			if (data.success) {
				setStep("success");
				setTimeout(() => {
					onClose();
					setTimeout(onSuccess, 100);
				}, 1500);
			} else {
				throw new Error(data.error);
			}
		} catch (err) {
			const msg =
				err instanceof Error && err.message.includes("expired")
					? "Setup session expired. Please restart the setup process."
					: "Invalid code. Please check your authenticator app and try again.";
			setScanError(msg);
			setVerificationCode("");
		} finally {
			setIsLoading(false);
		}
	};

	const copySecret = async () => {
		try {
			await navigator.clipboard.writeText(secret);
			toast({ description: "Setup key copied to clipboard" });
		} catch {
			// silently ignore — clipboard may not be available
		}
	};

	const handleSignOut = () => {
		window.location.href = "/sign-out";
	};

	const title =
		step === "scan"
			? "Scan this QR code"
			: step === "success"
				? "Two-factor authentication is on"
				: "Set up two-factor authentication";
	const description =
		step === "scan"
			? "Open your authenticator app, add an account and scan the code below."
			: step === "success"
				? "Your account is now protected. Redirecting…"
				: "Your organization requires it to keep your account secure. It only takes a few minutes.";

	return (
		<AppDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && step !== "intro") onClose();
			}}
			size="form"
			pending={isLoading}
			icon={<ShieldCheck className="h-5 w-5" />}
			title={title}
			description={description}
			footer={
				step === "success" ? undefined : step === "scan" ? (
					<>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							disabled={isLoading}
							onClick={() => {
								setStep("intro");
								setVerificationCode("");
								setScanError("");
							}}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
						<Button
							type="button"
							className="btn-primary"
							disabled={verificationCode.length !== 6 || isLoading}
							onClick={() => void verifyTwoFactor()}
						>
							{isLoading ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<ShieldCheck className="h-4 w-4" />
							)}
							{isLoading ? "Verifying…" : "Verify and continue"}
						</Button>
					</>
				) : (
					<>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							onClick={handleSignOut}
						>
							Sign out
						</Button>
						<Button
							type="button"
							className="btn-primary"
							disabled={isLoading}
							onClick={() => void setupTwoFactor()}
						>
							{isLoading ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<ShieldCheck className="h-4 w-4" />
							)}
							{isLoading ? "Starting…" : "Start setup"}
						</Button>
					</>
				)
			}
		>
				{/* ── Intro ── */}
				{step === "intro" && (
					<>

						{/* Steps overview */}
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
							{SETUP_STEPS.map((s, i) => (
								<div key={s.title} className="flex gap-3">
									<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#078FAB]/10 text-xs font-semibold text-[#078FAB]">
										{i + 1}
									</div>
									<div>
										<p className="text-sm font-semibold text-slate-700">
											{s.title}
										</p>
										<p className="text-xs text-slate-500">{s.desc}</p>
									</div>
								</div>
							))}
						</div>

						{setupError ? (
							<p className="text-sm text-red" role="alert">
								{setupError}
							</p>
						) : null}

						<button
							type="button"
							className="text-sm text-[#078FAB] hover:underline"
							onClick={() =>
								toast({
									description:
										"Two-factor authentication protects your account even if your password is stolen.",
								})
							}
						>
							Why is this required?
						</button>
					</>
				)}

				{/* ── Scan & Verify ── */}
				{step === "scan" && (
					<>
						{/* Progress */}
						<div>
							<p className="mb-1.5 text-xs font-semibold text-[#078FAB]">
								Step 2 of 3
							</p>
							<div
								className="flex gap-1"
								role="progressbar"
								aria-valuenow={2}
								aria-valuemin={1}
								aria-valuemax={3}
							>
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className="h-1 flex-1 rounded-full"
										style={{
											backgroundColor: i < 2 ? "#078FAB" : "#e2e8f0",
										}}
									/>
								))}
							</div>
						</div>

						{/* QR Code */}
						<div className="flex justify-center">
							{qrCode ? (
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=${encodeURIComponent(qrCode)}`}
										alt="Authenticator QR code"
										className="h-40 w-40"
									/>
								</div>
							) : (
								<div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
									<Smartphone className="h-8 w-8 text-slate-300" />
								</div>
							)}
						</div>

						{/* Manual key */}
						{secret && (
							<div className="flex items-center justify-center gap-2 text-sm text-slate-500">
								<span>Can't scan? Enter this key instead:</span>
								<code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-700">
									{secret}
								</code>
								<button
									type="button"
									onClick={() => void copySecret()}
									className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
								>
									<ClipboardCopy className="h-3 w-3" />
									Copy
								</button>
							</div>
						)}

						<div className="border-t border-slate-100" />

						<div className="space-y-2">
							<p className="text-center text-sm font-medium text-slate-700">
								Enter the 6-digit code from the app
							</p>

							<div className="flex justify-center">
								<InputOTP
									maxLength={6}
									value={verificationCode}
									disabled={isLoading}
									containerClassName="w-full max-w-full justify-center"
									onChange={(value) => {
										setVerificationCode(value);
										if (scanError) setScanError("");
									}}
									onComplete={() => void verifyTwoFactor()}
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

							<p className="text-center text-xs text-slate-400">
								Codes change every 30 seconds. If a code is rejected, check that
								your phone's clock is set automatically.
							</p>

							{scanError ? (
								<p className="text-sm text-red" role="alert">
									{scanError}
								</p>
							) : null}
						</div>
					</>
				)}
		</AppDialog>
	);
};

export default TwoFactorModal;
