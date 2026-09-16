"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useToast } from "@/hooks/use-toast";

const VIEW_AS_STORAGE_KEY = "caalm_view_as";

export type ImpersonationStatus = {
	active: boolean;
	expired?: boolean;
	readOnly?: boolean;
	actorUserId?: string;
	orgId?: string;
	reason?: string;
	startedAt?: string;
	expiresAt?: string;
	target?: {
		$id: string;
		fullName: string;
		email: string;
		department?: string;
		departmentLabel?: string;
	};
};

type ImpersonationContextValue = {
	status: ImpersonationStatus;
	loading: boolean;
	isImpersonating: boolean;
	readOnly: boolean;
	refreshStatus: () => Promise<ImpersonationStatus>;
	endSession: () => Promise<void>;
};

const ImpersonationContext = createContext<ImpersonationContextValue | null>(
	null,
);

export function setViewAsClientHint(targetUserId: string | null): void {
	if (typeof window === "undefined") return;
	if (targetUserId) {
		sessionStorage.setItem(VIEW_AS_STORAGE_KEY, targetUserId);
	} else {
		sessionStorage.removeItem(VIEW_AS_STORAGE_KEY);
	}
}

export function getViewAsClientHint(): string | null {
	if (typeof window === "undefined") return null;
	return sessionStorage.getItem(VIEW_AS_STORAGE_KEY);
}

async function fetchStatus(): Promise<ImpersonationStatus> {
	const res = await fetch("/api/impersonation/status", {
		credentials: "same-origin",
	});
	if (res.status === 401) {
		return { active: false };
	}
	if (!res.ok) {
		return { active: false };
	}
	return (await res.json()) as ImpersonationStatus;
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
	const { toast } = useToast();
	const [status, setStatus] = useState<ImpersonationStatus>({ active: false });
	const [loading, setLoading] = useState(true);

	const refreshStatus = useCallback(async () => {
		const next = await fetchStatus();
		setStatus(next);
		setLoading(false);
		if (next.active && next.target?.$id) {
			setViewAsClientHint(next.target.$id);
		} else if (next.expired) {
			setViewAsClientHint(null);
		} else if (!next.active) {
			setViewAsClientHint(null);
		}
		return next;
	}, []);

	useEffect(() => {
		void refreshStatus();
		const id = window.setInterval(() => {
			void refreshStatus();
		}, 15000);
		return () => window.clearInterval(id);
	}, [refreshStatus]);

	useEffect(() => {
		if (status.active) {
			document.body.dataset.impersonationReadonly = "true";
		} else {
			delete document.body.dataset.impersonationReadonly;
		}
		return () => {
			delete document.body.dataset.impersonationReadonly;
		};
	}, [status.active]);

	useEffect(() => {
		if (!status.active || !status.expiresAt) return;
		const expiresAt = new Date(status.expiresAt).getTime();
		const wait = Math.max(0, expiresAt - Date.now() + 250);
		const timer = window.setTimeout(() => {
			void (async () => {
				const next = await refreshStatus();
				if (next.expired || !next.active) {
					toast({
						title: "View as user ended",
						description: "The impersonation session expired.",
					});
					setViewAsClientHint(null);
					window.location.reload();
				}
			})();
		}, wait);
		return () => window.clearTimeout(timer);
	}, [status.active, status.expiresAt, refreshStatus, toast]);

	const endSession = useCallback(async () => {
		const res = await fetch("/api/impersonation/end", {
			method: "POST",
			credentials: "same-origin",
		});
		if (!res.ok) {
			const payload = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			throw new Error(payload.error || "Failed to end session");
		}
		setViewAsClientHint(null);
		toast({
			title: "View as user ended",
			description: "You are back to your own account.",
		});
		window.location.reload();
	}, [toast]);

	const value = useMemo(
		() => ({
			status,
			loading,
			isImpersonating: Boolean(status.active),
			readOnly: Boolean(status.active && status.readOnly !== false),
			refreshStatus,
			endSession,
		}),
		[status, loading, refreshStatus, endSession],
	);

	return (
		<ImpersonationContext.Provider value={value}>
			{children}
		</ImpersonationContext.Provider>
	);
}

export function useImpersonation(): ImpersonationContextValue {
	const ctx = useContext(ImpersonationContext);
	if (!ctx) {
		return {
			status: { active: false },
			loading: false,
			isImpersonating: false,
			readOnly: false,
			refreshStatus: async () => ({ active: false }),
			endSession: async () => undefined,
		};
	}
	return ctx;
}
