"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { DEFAULT_ORG_TIMEZONE, resolveOrgTimezone } from "@/lib/timezone";

interface OrganizationContextType {
	orgId: string | null;
	setOrgId: (orgId: string) => void;
	loading: boolean;
	timezone: string;
	timezoneLoading: boolean;
	refreshOrgProfile: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
	undefined,
);

const OrganizationProvider = ({ children }: { children: ReactNode }) => {
	const [orgId, setOrgId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [timezone, setTimezone] = useState(DEFAULT_ORG_TIMEZONE);
	const [timezoneLoading, setTimezoneLoading] = useState(true);

	const loadTimezone = useCallback(async (id: string | null) => {
		if (!id) {
			setTimezone(DEFAULT_ORG_TIMEZONE);
			setTimezoneLoading(false);
			return;
		}
		setTimezoneLoading(true);
		try {
			const res = await fetch(
				`/api/organization/default?orgId=${encodeURIComponent(id)}`,
				{ cache: "no-store" },
			);
			if (res.ok) {
				const data = await res.json();
				setTimezone(resolveOrgTimezone(data.timezone));
			} else {
				setTimezone(DEFAULT_ORG_TIMEZONE);
			}
		} catch {
			setTimezone(DEFAULT_ORG_TIMEZONE);
		} finally {
			setTimezoneLoading(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		const resolveOrg = async () => {
			const savedOrgId = localStorage.getItem("caalm_org_id");
			// default_organization is the real seed org $id, not a placeholder
			if (savedOrgId) {
				if (!cancelled) {
					setOrgId(savedOrgId);
					setLoading(false);
				}
			}

			try {
				const res = await fetch("/api/organization/default", {
					cache: "no-store",
				});
				if (res.ok) {
					const data = await res.json();
					if (data.orgId && !cancelled) {
						setOrgId(data.orgId);
						localStorage.setItem("caalm_org_id", data.orgId);
						setTimezone(resolveOrgTimezone(data.timezone));
						setTimezoneLoading(false);
						setLoading(false);
						return;
					}
				}
			} catch {
				// Fall through to saved / null
			}

			if (!cancelled) {
				if (savedOrgId) {
					setOrgId(savedOrgId);
				}
				setLoading(false);
			}
		};

		resolveOrg();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!orgId) return;
		void loadTimezone(orgId);
	}, [orgId, loadTimezone]);

	const handleSetOrgId = (newOrgId: string) => {
		setOrgId(newOrgId);
		localStorage.setItem("caalm_org_id", newOrgId);
	};

	const refreshOrgProfile = useCallback(async () => {
		await loadTimezone(orgId);
	}, [loadTimezone, orgId]);

	return (
		<OrganizationContext.Provider
			value={{
				orgId,
				setOrgId: handleSetOrgId,
				loading,
				timezone,
				timezoneLoading,
				refreshOrgProfile,
			}}
		>
			{children}
		</OrganizationContext.Provider>
	);
};

export { OrganizationProvider };

export const useOrganization = () => {
	const context = useContext(OrganizationContext);

	if (context) {
		return context;
	}

	return {
		orgId: null,
		setOrgId: () => undefined,
		loading: true,
		timezone: DEFAULT_ORG_TIMEZONE,
		timezoneLoading: true,
		refreshOrgProfile: async () => undefined,
	};
};
