"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { StepUpOtpDialog } from "@/components/auth/StepUpOtpDialog";
import { fetchStepUpStatus } from "@/lib/auth/step-up-client";
import { useAuth } from "@/contexts/AuthContext";

interface StepUpContextValue {
	ensureStepUp: () => Promise<boolean>;
}

const StepUpContext = createContext<StepUpContextValue | null>(null);

export function StepUpProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const resolverRef = useRef<((value: boolean) => void) | null>(null);

	const ensureStepUp = useCallback(async (): Promise<boolean> => {
		if (!user?.email) return false;

		const status = await fetchStepUpStatus();
		if (status.verified) return true;

		return new Promise<boolean>((resolve) => {
			resolverRef.current = resolve;
			setOpen(true);
		});
	}, [user?.email]);

	const handleVerified = useCallback(() => {
		setOpen(false);
		resolverRef.current?.(true);
		resolverRef.current = null;
	}, []);

	const handleCancel = useCallback(() => {
		setOpen(false);
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
