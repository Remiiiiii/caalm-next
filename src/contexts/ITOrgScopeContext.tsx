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
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";

export const IT_HUB_ORG_STORAGE_KEY = "caalm_it_hub_org_id";

type ITOrgScopeValue = {
	/** Tenant the IT hub is inspecting. Null on the platform fleet home. */
	hubOrgId: string | null;
	/** Product membership org from OrganizationContext — never overwritten by hub switch. */
	membershipOrgId: string | null;
	canViewFleet: boolean;
	setHubOrgId: (orgId: string | null) => void;
};

const ITOrgScopeContext = createContext<ITOrgScopeValue | undefined>(undefined);

export function ITOrgScopeProvider({ children }: { children: ReactNode }) {
	const { orgId: membershipOrgId } = useOrganization();
	const { permissions } = usePermissions();
	const canViewFleet =
		permissions.includes(PERMISSIONS.PLATFORM.VIEW_ALL_ORGS) &&
		permissions.includes(PERMISSIONS.IT.VIEW_MONITORING);
	const [storedHubOrgId, setStoredHubOrgId] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const saved = sessionStorage.getItem(IT_HUB_ORG_STORAGE_KEY);
		setStoredHubOrgId(saved && saved.length > 0 ? saved : null);
	}, []);

	const setHubOrgId = useCallback(
		(orgId: string | null) => {
			setStoredHubOrgId(orgId);
			if (typeof window === "undefined") return;
			if (orgId) {
				sessionStorage.setItem(IT_HUB_ORG_STORAGE_KEY, orgId);
			} else {
				sessionStorage.removeItem(IT_HUB_ORG_STORAGE_KEY);
			}
		},
		[],
	);

	const hubOrgId = canViewFleet ? storedHubOrgId : membershipOrgId;

	const value = useMemo(
		() => ({
			hubOrgId,
			membershipOrgId,
			canViewFleet,
			setHubOrgId,
		}),
		[hubOrgId, membershipOrgId, canViewFleet, setHubOrgId],
	);

	return (
		<ITOrgScopeContext.Provider value={value}>
			{children}
		</ITOrgScopeContext.Provider>
	);
}

export function useITOrgScope(): ITOrgScopeValue {
	const ctx = useContext(ITOrgScopeContext);
	if (!ctx) {
		throw new Error("useITOrgScope must be used inside ITOrgScopeProvider");
	}
	return ctx;
}
