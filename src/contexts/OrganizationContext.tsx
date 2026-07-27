"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface OrganizationContextType {
	orgId: string | null;
	setOrgId: (orgId: string) => void;
	loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
	undefined,
);

const OrganizationProvider = ({ children }: { children: ReactNode }) => {
	const [orgId, setOrgId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		const resolveOrg = async () => {
			const savedOrgId = localStorage.getItem("caalm_org_id");
			if (savedOrgId && savedOrgId !== "default_organization") {
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

	const handleSetOrgId = (newOrgId: string) => {
		setOrgId(newOrgId);
		localStorage.setItem("caalm_org_id", newOrgId);
	};

	return (
		<OrganizationContext.Provider
			value={{
				orgId,
				setOrgId: handleSetOrgId,
				loading,
			}}
		>
			{children}
		</OrganizationContext.Provider>
	);
};

export { OrganizationProvider };

export const useOrganization = () => {
	const context = useContext(OrganizationContext);

	// Always return the same structure to ensure consistent hook calls
	// Don't throw - return default values instead
	if (context) {
		return context;
	}

	return {
		orgId: null,
		setOrgId: () => undefined,
		loading: true,
	};
};
