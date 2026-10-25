"use client";

import { AlertTriangle, Clock, LogOut, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { formatTime, getTimerValues } from "@/lib/inactivity-config";

interface InactivityDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onContinue: () => void;
	onLogout: () => void;
}

export default function InactivityDialog({
	isOpen,
	onClose,
	onContinue,
	onLogout,
}: InactivityDialogProps) {
	const { countdownTime } = getTimerValues();
	const initialSeconds = Math.floor(countdownTime / 1000);
	const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = useCallback(async () => {
		setIsLoggingOut(true);
		try {
			await onLogout();
		} catch (error) {
			console.error("Logout error:", error);
			onClose();
		}
	}, [onLogout, onClose]);

	const handleContinue = () => {
		onContinue();
		onClose();
	};

	useEffect(() => {
		if (isOpen) {
			setSecondsLeft(initialSeconds);
			setIsLoggingOut(false);
		}
	}, [isOpen, initialSeconds]);

	useEffect(() => {
		if (!isOpen) return;

		const countdownTimer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clearInterval(countdownTimer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(countdownTimer);
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && secondsLeft <= 0 && !isLoggingOut) {
			void handleLogout();
		}
	}, [isOpen, secondsLeft, isLoggingOut, handleLogout]);

	return (
		<AppDialog
			open={isOpen}
			onOpenChange={(next) => {
				if (!next && !isLoggingOut) handleContinue();
			}}
			pending={isLoggingOut}
			icon={<Clock className="h-5 w-5" />}
			title="Session expiring"
			description={`Due to inactivity, you'll be signed out in ${formatTime(secondsLeft)}.`}
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						disabled={isLoggingOut}
						onClick={() => void handleLogout()}
					>
						<LogOut className="h-4 w-4" />
						{isLoggingOut ? "Signing out…" : "Sign out now"}
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={isLoggingOut}
						onClick={handleContinue}
					>
						<RefreshCw className="h-4 w-4" />
						Continue session
					</Button>
				</>
			}
		>
			<div className="flex items-start gap-2 rounded-lg border border-orange/20 bg-orange/5 px-4 py-2.5 text-sm text-orange">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
				<span>
					For security reasons, your session will be completely terminated and
					you'll need to sign in again.
				</span>
			</div>
		</AppDialog>
	);
}
