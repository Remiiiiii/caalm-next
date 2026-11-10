"use client";

import {
	AlertTriangle,
	Check,
	Clock,
	Info,
	Loader2,
	ShieldCheck,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { STEP_UP_TTL_MS } from "@/lib/auth/step-up-client";
import {
	resolveStepUpPrompt,
	type StepUpPrompt,
	type StepUpSummaryRow,
	type StepUpTone,
} from "@/lib/auth/step-up-prompt";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 3;
const SUCCESS_CLOSE_MS = 700;

function formatCountdown(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type FeedbackKind =
	| "idle"
	| "submitting"
	| "wrong"
	| "exhausted"
	| "expired"
	| "success"
	| "info";

interface StepUpOtpDialogProps {
	open: boolean;
	email: string;
	onVerified: () => void;
	onCancel: () => void;
	tone?: StepUpTone;
	icon?: ReactNode;
	title?: string;
	description?: string;
	summaryRows?: StepUpSummaryRow[];
	confirmLabel?: string;
	confirmingLabel?: string;
	successMessage?: string;
	onDidntGetCode?: () => void;
	helpHref?: string;
	prompt?: StepUpPrompt;
}

export function StepUpOtpDialog({
	open,
	email,
	onVerified,
	onCancel,
	tone,
	icon,
	title,
	description,
	summaryRows,
	confirmLabel,
	confirmingLabel,
	successMessage,
	onDidntGetCode,
	helpHref,
	prompt,
}: StepUpOtpDialogProps) {
	const { toast } = useToast();
	const codeLabelId = useId();
	const resolved = resolveStepUpPrompt(
		{
			tone: tone ?? prompt?.tone,
			title: title ?? prompt?.title,
			description: description ?? prompt?.description,
			summaryRows: summaryRows ?? prompt?.summaryRows,
			confirmLabel: confirmLabel ?? prompt?.confirmLabel,
			confirmingLabel: confirmingLabel ?? prompt?.confirmingLabel,
			successMessage: successMessage ?? prompt?.successMessage,
			helpHref: helpHref ?? prompt?.helpHref,
		},
		email,
	);
	const isDanger = resolved.tone === "danger";

	const [otp, setOtp] = useState("");
	const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("idle");
	const [feedbackText, setFeedbackText] = useState("");
	const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
	const [isLoading, setIsLoading] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(STEP_UP_TTL_MS / 1000);
	const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
	const expiresAtRef = useRef<number | null>(null);
	const requestedRef = useRef(false);
	const submitLockRef = useRef(false);

	const startCountdown = useCallback(() => {
		expiresAtRef.current = Date.now() + STEP_UP_TTL_MS;
		setSecondsLeft(Math.ceil(STEP_UP_TTL_MS / 1000));
		setResendIn(RESEND_COOLDOWN_SECONDS);
	}, []);

	useEffect(() => {
		if (!open) {
			requestedRef.current = false;
			submitLockRef.current = false;
			setOtp("");
			setFeedbackKind("idle");
			setFeedbackText("");
			setAttemptsLeft(MAX_ATTEMPTS);
			setIsLoading(false);
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
				setFeedbackKind("info");
				setFeedbackText(
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
			const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
			setSecondsLeft(remaining);
			if (remaining === 0) {
				setFeedbackKind((prev) =>
					prev === "success" || prev === "exhausted" ? prev : "expired",
				);
				setFeedbackText((prev) =>
					prev && prev.length > 0
						? prev
						: "This code has expired. Request a new one.",
				);
			}
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [open, isLoading]);

	useEffect(() => {
		if (!open || resendIn <= 0) return;
		const id = window.setInterval(() => {
			setResendIn((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => window.clearInterval(id);
	}, [open, resendIn]);

	const isExpired = secondsLeft <= 0 && expiresAtRef.current !== null;
	const cellsLocked =
		isLoading ||
		isExpired ||
		feedbackKind === "exhausted" ||
		feedbackKind === "success";
	const primaryDisabled =
		cellsLocked || otp.length !== 6 || feedbackKind === "exhausted";

	const handleVerify = useCallback(
		async (code = otp) => {
			if (submitLockRef.current) return;
			if (cellsLocked || code.length !== 6) {
				setFeedbackKind("wrong");
				setFeedbackText("Enter the 6-digit code from your email");
				return;
			}
			submitLockRef.current = true;
			setIsLoading(true);
			setFeedbackKind("submitting");
			setFeedbackText("Checking your code.");
			try {
				const res = await fetch("/api/auth/step-up/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ otp: code }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) {
					const apiError =
						typeof body.error === "string" ? body.error : "Invalid code";
					if (apiError.toLowerCase().includes("too many attempts")) {
						setAttemptsLeft(0);
						setFeedbackKind("exhausted");
						setFeedbackText("Too many attempts. Request a new code.");
						setOtp("");
						return;
					}
					if (apiError.toLowerCase().includes("expired")) {
						setFeedbackKind("expired");
						setFeedbackText("This code has expired. Request a new one.");
						setOtp("");
						return;
					}
					const nextLeft = Math.max(0, attemptsLeft - 1);
					setAttemptsLeft(nextLeft);
					if (nextLeft === 0) {
						setFeedbackKind("exhausted");
						setFeedbackText("Too many attempts. Request a new code.");
						setOtp("");
						return;
					}
					setFeedbackKind("wrong");
					setFeedbackText(
						`That code did not match. ${nextLeft} attempt${nextLeft === 1 ? "" : "s"} left.`,
					);
					return;
				}
				setFeedbackKind("success");
				setFeedbackText(resolved.successMessage);
				window.setTimeout(() => {
					onVerified();
				}, SUCCESS_CLOSE_MS);
			} catch (err) {
				setFeedbackKind("wrong");
				setFeedbackText(err instanceof Error ? err.message : "Invalid code");
			} finally {
				setIsLoading(false);
				submitLockRef.current = false;
			}
		},
		[attemptsLeft, cellsLocked, onVerified, otp, resolved.successMessage],
	);

	const handleResend = async () => {
		if (isResending || resendIn > 0) return;
		setIsResending(true);
		setOtp("");
		setAttemptsLeft(MAX_ATTEMPTS);
		setFeedbackKind("info");
		setFeedbackText("A new code was sent.");
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
			setFeedbackKind("info");
			setFeedbackText(
				err instanceof Error
					? err.message
					: "Could not resend verification code",
			);
		} finally {
			setIsResending(false);
		}
	};

	const handleDidntGetCode = () => {
		if (onDidntGetCode) {
			onDidntGetCode();
			return;
		}
		const href = resolved.helpHref;
		if (href) {
			window.open(href, "_blank", "noopener,noreferrer");
			return;
		}
		toast({
			title: "Didn't get the code?",
			description: `Check your inbox and spam folder for a message to ${email}. Use Resend code if it did not arrive.`,
		});
	};

	const countdownClass =
		secondsLeft <= 0
			? "text-red"
			: secondsLeft <= 60
				? "text-orange"
				: "text-slate-500";

	const slotClass = (filled: boolean, danger: boolean) =>
		cn(
			"h-[52px] w-[42px] rounded-md border-[1.5px] font-mono text-[21px] font-semibold shadow-none first:rounded-md first:border-[1.5px] last:rounded-md",
			filled ? "bg-white" : "bg-slate-50",
			danger
				? "border-red text-red"
				: filled
					? "border-slate-300 text-slate-700"
					: "border-slate-300 text-slate-700",
			feedbackKind === "success" && "border-green text-green",
		);

	const headerIcon = icon ?? <ShieldCheck className="h-5 w-5" aria-hidden />;

	return (
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
			}}
			size="form"
			pending={isLoading || feedbackKind === "success"}
			variant={isDanger ? "destructive" : "default"}
			icon={headerIcon}
			title={resolved.title}
			description={resolved.description}
			footerClassName="justify-between gap-3 border-t border-slate-200 bg-slate-50"
			footer={
				<>
					<p className="flex min-w-0 flex-1 items-start gap-1 text-[10.5px] leading-snug text-slate-400">
						<Info
							className="mt-0.5 h-3 w-3 shrink-0 text-slate-500"
							aria-hidden
						/>
						Confirmed devices skip this step for 5 minutes.
					</p>
					<div className="flex shrink-0 items-center gap-2.5">
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							disabled={isLoading || feedbackKind === "success"}
							onClick={onCancel}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className={isDanger ? "delete-btn" : "btn-primary"}
							disabled={primaryDisabled}
							aria-busy={isLoading}
							aria-describedby={codeLabelId}
							onClick={() => void handleVerify()}
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
							) : feedbackKind === "success" ? (
								<Check className="h-4 w-4" aria-hidden />
							) : (
								<ShieldCheck className="h-4 w-4" aria-hidden />
							)}
							{isLoading
								? resolved.confirmingLabel
								: feedbackKind === "success"
									? "Done"
									: resolved.confirmLabel}
						</Button>
					</div>
				</>
			}
		>
			<div className="flex flex-col gap-4 py-4">
				{resolved.summaryRows.length > 0 ? (
					<dl className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
						{resolved.summaryRows.map((row) => (
							<div
								key={`${row.label}-${row.value}`}
								className={cn(
									"grid grid-cols-[5.5rem_1fr] items-center gap-3 px-4 py-2.5 text-xs",
									row.lead && "bg-slate-100",
								)}
							>
								<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
									{row.label}
								</dt>
								<dd
									className={cn(
										"truncate text-right",
										row.lead
											? "font-semibold text-slate-700"
											: "text-slate-600",
									)}
								>
									{row.value}
								</dd>
							</div>
						))}
					</dl>
				) : null}

				<div className="flex flex-col items-center">
					<p
						id={codeLabelId}
						className="mb-2 text-center text-[11px] text-slate-500"
					>
						Enter the 6-digit code
					</p>
					<InputOTP
						maxLength={6}
						value={otp}
						onChange={setOtp}
						onComplete={(value) => {
							void handleVerify(value);
						}}
						disabled={cellsLocked}
						autoFocus
						containerClassName="justify-center gap-[11px]"
					>
						<InputOTPGroup className="gap-[7px]">
							{[0, 1, 2].map((index) => (
								<InputOTPSlot
									key={index}
									index={index}
									aria-label={`Digit ${index + 1}`}
									className={slotClass(
										Boolean(otp[index]),
										feedbackKind === "wrong",
									)}
								/>
							))}
						</InputOTPGroup>
						<span className="w-[11px] shrink-0" aria-hidden />
						<InputOTPGroup className="gap-[7px]">
							{[3, 4, 5].map((index) => (
								<InputOTPSlot
									key={index}
									index={index}
									aria-label={`Digit ${index + 1}`}
									className={slotClass(
										Boolean(otp[index]),
										feedbackKind === "wrong",
									)}
								/>
							))}
						</InputOTPGroup>
					</InputOTP>
				</div>

				<div
					className="flex min-h-[30px] items-center justify-center px-1"
					aria-live="polite"
					role={
						feedbackKind === "wrong" ||
						feedbackKind === "exhausted" ||
						feedbackKind === "expired"
							? "alert"
							: undefined
					}
				>
					{feedbackKind === "idle" || !feedbackText ? null : (
						<p
							className={cn(
								"flex items-center gap-1.5 text-center text-xs",
								feedbackKind === "wrong" ||
									feedbackKind === "exhausted" ||
									feedbackKind === "expired"
									? "text-red"
									: feedbackKind === "success"
										? "text-green"
										: "text-slate-500",
							)}
						>
							{feedbackKind === "wrong" || feedbackKind === "exhausted" ? (
								<AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
							) : null}
							{feedbackKind === "expired" ? (
								<Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
							) : null}
							{feedbackKind === "success" ? (
								<Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
							) : null}
							{feedbackText}
						</p>
					)}
				</div>

				<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
					<p
						className={cn(
							"flex items-center gap-1 tabular-nums",
							countdownClass,
						)}
					>
						<Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
						<span aria-live="off">
							{isExpired
								? "Expires in 0:00"
								: `Expires in ${formatCountdown(secondsLeft)}`}
						</span>
					</p>
					<span className="text-slate-400" aria-hidden>
						·
					</span>
					<Button
						type="button"
						variant="ghost"
						className="h-auto rounded-none px-0 py-0 text-xs font-medium text-[#0f5384] hover:bg-transparent hover:text-[#078fab]"
						disabled={isResending || resendIn > 0 || isLoading}
						aria-disabled={isResending || resendIn > 0 || isLoading}
						onClick={() => void handleResend()}
					>
						{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
					</Button>
				</div>

				<button
					type="button"
					className="mx-auto text-center text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-700"
					onClick={handleDidntGetCode}
				>
					Didn't get the code?
				</button>
			</div>
		</AppDialog>
	);
}
