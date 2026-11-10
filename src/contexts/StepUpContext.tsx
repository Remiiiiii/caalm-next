"use client";

import { ShieldCheck } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { StepUpOtpDialog } from "@/components/auth/StepUpOtpDialog";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStepUpStatus } from "@/lib/auth/step-up-client";
import type { StepUpPrompt } from "@/lib/auth/step-up-prompt";

interface StepUpContextValue {
	ensureStepUp: (prompt?: StepUpPrompt) => Promise<boolean>;
}

const StepUpContext = createContext<StepUpContextValue | null>(null);

export function StepUpProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [prompt, setPrompt] = useState<StepUpPrompt | undefined>();
	const resolverRef = useRef<((value: boolean) => void) | null>(null);

	const ensureStepUp = useCallback(
		async (nextPrompt?: StepUpPrompt): Promise<boolean> => {
			if (!user?.email) return false;

			const status = await fetchStepUpStatus();
			if (status.verified) return true;

			return new Promise<boolean>((resolve) => {
				resolverRef.current = resolve;
				setPrompt(nextPrompt);
				setOpen(true);
			});
		},
		[user?.email],
	);

	const handleVerified = useCallback(() => {
		setOpen(false);
		setPrompt(undefined);
		resolverRef.current?.(true);
		resolverRef.current = null;
	}, []);

	const handleCancel = useCallback(() => {
		setOpen(false);
		setPrompt(undefined);
		resolverRef.current?.(false);
		resolverRef.current = null;
	}, []);

	const value = useMemo(() => ({ ensureStepUp }), [ensureStepUp]);

	return (
		<StepUpContext.Provider value={value}>
			{children}
			{user?.email ? (
				<StepUpOtpDialog
					open={open}
					email={user.email}
					prompt={prompt}
					icon={prompt?.icon ?? <ShieldCheck className="h-5 w-5" aria-hidden />}
					onVerified={handleVerified}
					onCancel={handleCancel}
				/>
			) : null}
		</StepUpContext.Provider>
	);
}

export function useStepUp(): StepUpContextValue {
	const ctx = useContext(StepUpContext);
	if (!ctx) {
		throw new Error("useStepUp must be used within StepUpProvider");
	}
	return ctx;
}

export function useOptionalStepUp(): StepUpContextValue | null {
	return useContext(StepUpContext);
}
