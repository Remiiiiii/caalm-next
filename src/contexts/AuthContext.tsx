"use client";

import type { Models } from "appwrite";
import { usePathname } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { normalizeUserRole } from "@/constants/rbac";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { isAuthRoute, isProtectedAppRoute } from "@/lib/auth/protectedRoutes";
import {
	CACHED_USER_STORAGE_KEY,
	getCachedUserDisplayName,
	getCachedUserId,
	SESSION_CHANGED_NOTICE_PARAM,
	SESSION_CHANGED_NOTICE_VALUE,
} from "@/lib/auth/session-sync";
import { getCurrentUserFrom2FA } from "@/lib/actions/user.actions";
import {
	getDashboardUrlForUser,
	invalidateDashboardUrlCache,
} from "@/lib/utils/dashboard-redirect";
import { useToast } from "@/hooks/use-toast";

type AuthenticatedUser = Models.User<Models.Preferences> & {
	role?: string;
	division?: string;
	accountId?: string;
	avatar?: string;
	prefs?: Models.Preferences & {
		profileImage?: string | null;
		profileImageId?: string | null;
	};
};

const CACHE_USER_TTL_MS = 300000;

function readCachedAuthUser(): Models.User<Models.Preferences> | null {
	if (typeof window === "undefined") return null;
	try {
		const cachedUser = localStorage.getItem(CACHED_USER_STORAGE_KEY);
		if (!cachedUser) return null;
		const parsed = JSON.parse(cachedUser);
		if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_USER_TTL_MS) {
			return parsed.user ?? null;
		}
	} catch {
		// Invalid cache
	}
	return null;
}

interface AuthContextType {
	user: Models.User<Models.Preferences> | null;
	setUser: (user: Models.User<Models.Preferences> | null) => void;
	loading: boolean;
	logout: (reason?: "manual" | "inactivity") => Promise<void>;
	isSessionValid: boolean;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [_mounted, setMounted] = useState(false);
	const [isSessionValid, setIsSessionValid] = useState(false);
	const pathname = usePathname();
	const { toast } = useToast();
	const userIdRef = useRef<string | null>(null);
	const sessionNoticeShownRef = useRef(false);
	const crossTabRedirectRef = useRef(false);

	// Hydrate from localStorage before paint so the layout gate does not block warm loads
	useLayoutEffect(() => {
		const cached = readCachedAuthUser();
		if (cached) {
			setUser(cached);
			setIsSessionValid(true);
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		setMounted(true);

		const checkSession = async () => {
			try {
				let usedCache = Boolean(readCachedAuthUser());

				// Optimize: Check localStorage first for cached user data to show UI immediately
				if (typeof window !== "undefined") {
					const cachedUser = localStorage.getItem(CACHED_USER_STORAGE_KEY);
					if (cachedUser) {
						try {
							const parsed = JSON.parse(cachedUser);
							// Only use cache if it's less than 5 minutes old
							if (
								parsed.timestamp &&
								Date.now() - parsed.timestamp < CACHE_USER_TTL_MS
							) {
								setUser(parsed.user);
								setIsSessionValid(true);
								setLoading(false);
								usedCache = true;
								// Continue with fresh check in background
							}
						} catch {
							// Invalid cache, continue with fresh check
						}
					}
				}

				if (!usedCache) {
					setLoading(true);
				}

				// First try to get session-based user
				const sessionUser = await getSessionUser();

				// Only log in development
				if (process.env.NODE_ENV === "development") {
					console.log(
						"AuthContext: Session user check result:",
						sessionUser ? "Found" : "Not found",
					);
				}

				if (sessionUser) {
					if (process.env.NODE_ENV === "development") {
						console.log("AuthContext: Using session-based user");
					}
					const typedSessionUser = sessionUser as AuthenticatedUser;
					if (typeof typedSessionUser.role === "string") {
						typedSessionUser.role = normalizeUserRole(typedSessionUser.role);
					}
					// Ensure complete serialization by parsing and stringifying
					const serializedUser = JSON.parse(
						JSON.stringify(typedSessionUser),
					) as AuthenticatedUser;
					setUser(serializedUser);
					setIsSessionValid(true);

					// Cache user data for faster subsequent loads
					if (typeof window !== "undefined") {
						try {
							localStorage.setItem(
								CACHED_USER_STORAGE_KEY,
								JSON.stringify({
									user: serializedUser,
									timestamp: Date.now(),
								}),
							);
						} catch {
							// localStorage might be full, ignore
						}
					}
				} else {
					// Check for 2FA-based authentication only if we're on a dashboard route
					// This prevents automatic authentication on sign-in page
					const isDashboardRoute = isProtectedAppRoute(pathname);
					const onAuthRoute = isAuthRoute(pathname);

					if (process.env.NODE_ENV === "development") {
						console.log(
							"AuthContext: Current pathname:",
							pathname,
							"isDashboardRoute:",
							isDashboardRoute,
							"isAuthRoute:",
							onAuthRoute,
						);
					}

					if (onAuthRoute) {
						// Explicitly set to null on auth routes to prevent any 2FA interference
						if (process.env.NODE_ENV === "development") {
							console.log(
								"AuthContext: On auth route, explicitly setting user to null",
							);
						}
						setUser(null);
						setIsSessionValid(false);
					} else if (isDashboardRoute) {
						if (process.env.NODE_ENV === "development") {
							console.log(
								"AuthContext: On protected route, checking 2FA-based user for path:",
								pathname,
							);
						}
						const twoFAUser = await getCurrentUserFrom2FA();
						if (process.env.NODE_ENV === "development") {
							console.log(
								"AuthContext: 2FA user check result:",
								twoFAUser ? "Found" : "Not found",
							);
						}

						if (twoFAUser) {
							if (process.env.NODE_ENV === "development") {
								console.log("AuthContext: Using 2FA-based user for dashboard");
							}

							// Generate profile image URL from fileId
							let profileImageUrl = null;
							if (twoFAUser.profileImageId) {
								const bucketId =
									process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
								const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
								const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

								if (bucketId && endpoint && projectId) {
									// Use direct Appwrite URL (bucket must have "Any" read permission)
									profileImageUrl = `${endpoint}/storage/buckets/${bucketId}/files/${twoFAUser.profileImageId}/view?project=${projectId}`;
									console.log(
										"AuthContext: Generated profile image URL:",
										profileImageUrl,
									);
								}
							}

							// Convert the custom user object to match the expected format
							const convertedUser = {
								$id: twoFAUser.$id,
								name: twoFAUser.fullName,
								email: twoFAUser.email,
								role: normalizeUserRole(twoFAUser.role),
								accountId: twoFAUser.accountId,
								division: twoFAUser.division,
								avatar: twoFAUser.avatar,
								emailVerification: true,
								phoneVerification: false,
								prefs: {
									profileImage: profileImageUrl,
									profileImageId: twoFAUser.profileImageId || null,
								},
								registration: new Date().toISOString(),
								status: true,
								$createdAt: new Date().toISOString(),
								$updatedAt: new Date().toISOString(),
								labels: [],
								passwordUpdate: new Date().toISOString(),
								phone: "",
								accessedAt: new Date().toISOString(),
								mfa: false,
								targets: [],
							} as AuthenticatedUser;

							// Ensure complete serialization by parsing and stringifying
							const serializedUser = JSON.parse(
								JSON.stringify(convertedUser),
							) as AuthenticatedUser;
							setUser(serializedUser);
							setIsSessionValid(true);

							// Cache user data for faster subsequent loads
							if (typeof window !== "undefined") {
								try {
									localStorage.setItem(
										"cached_user",
										JSON.stringify({
											user: convertedUser,
											timestamp: Date.now(),
										}),
									);
								} catch {
									// localStorage might be full, ignore
								}
							}
						} else {
							if (process.env.NODE_ENV === "development") {
								console.log("AuthContext: No 2FA user found, setting to null");
							}
							setUser(null);
							setIsSessionValid(false);
						}
					} else {
						if (process.env.NODE_ENV === "development") {
							console.log(
								"AuthContext: Not on dashboard or auth route, setting to null",
							);
						}
						setUser(null);
						setIsSessionValid(false);
					}
				}
			} catch (error) {
				console.error("AuthContext: Session check failed:", error);
				setUser(null);
				setIsSessionValid(false);
			} finally {
				setLoading(false);
			}
		};

		checkSession();
	}, [pathname]);

	useEffect(() => {
		userIdRef.current = user?.$id ?? null;
	}, [user?.$id]);

	useEffect(() => {
		if (sessionNoticeShownRef.current || typeof window === "undefined") return;

		const params = new URLSearchParams(window.location.search);
		if (params.get(SESSION_CHANGED_NOTICE_PARAM) !== SESSION_CHANGED_NOTICE_VALUE) {
			return;
		}

		sessionNoticeShownRef.current = true;
		toast({
			title: "Session changed",
			description:
				"Your account changed in another tab. You were redirected to the correct dashboard.",
		});

		params.delete(SESSION_CHANGED_NOTICE_PARAM);
		const nextSearch = params.toString();
		const nextUrl = nextSearch
			? `${window.location.pathname}?${nextSearch}`
			: window.location.pathname;
		window.history.replaceState({}, "", nextUrl);
	}, [pathname, toast]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const redirectForSessionChange = async (
			nextUserId: string,
			displayName: string | null,
		) => {
			if (crossTabRedirectRef.current) return;
			crossTabRedirectRef.current = true;

			invalidateDashboardUrlCache();

			toast({
				title: "Session changed",
				description: displayName
					? `You signed in as ${displayName} in another tab. Redirecting to your dashboard.`
					: "You signed in with a different account in another tab. Redirecting to your dashboard.",
			});

			const orgId =
				localStorage.getItem("caalm_org_id") || "default_organization";
			const home = await getDashboardUrlForUser(nextUserId, orgId);
			window.location.href = home;
		};

		const handleStorage = (event: StorageEvent) => {
			if (event.key !== CACHED_USER_STORAGE_KEY) return;

			const previousUserId = userIdRef.current;

			if (!event.newValue) {
				if (previousUserId && isProtectedAppRoute(pathname)) {
					crossTabRedirectRef.current = true;
					toast({
						title: "Signed out",
						description:
							"You were signed out in another tab. Redirecting to sign in.",
					});
					window.location.href = "/sign-in?reason=session_changed";
				}
				return;
			}

			const nextUserId = getCachedUserId(event.newValue);
			if (!nextUserId || nextUserId === previousUserId) return;

			if (!previousUserId) {
				userIdRef.current = nextUserId;
				return;
			}

			void redirectForSessionChange(
				nextUserId,
				getCachedUserDisplayName(event.newValue),
			);
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [pathname, toast]);

	const refreshUser = async () => {
		try {
			// Check if on dashboard route (2FA-based user)
			const isDashboardRoute = isProtectedAppRoute(pathname);

			if (isDashboardRoute) {
				const twoFAUser = await getCurrentUserFrom2FA();
				if (twoFAUser) {
					// Generate profile image URL from fileId
					let profileImageUrl = null;
					if (twoFAUser.profileImageId) {
						const bucketId =
							process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
						const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
						const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

						if (bucketId && endpoint && projectId) {
							// Use direct Appwrite URL (bucket must have "Any" read permission)
							profileImageUrl = `${endpoint}/storage/buckets/${bucketId}/files/${twoFAUser.profileImageId}/view?project=${projectId}`;
							console.log(
								"refreshUser: Generated profile image URL:",
								profileImageUrl,
							);
						}
					}

					const convertedUser = {
						$id: twoFAUser.$id,
						name: twoFAUser.fullName,
						email: twoFAUser.email,
						role: normalizeUserRole(twoFAUser.role),
						accountId: twoFAUser.accountId,
						division: twoFAUser.division,
						avatar: twoFAUser.avatar,
						emailVerification: true,
						phoneVerification: false,
						prefs: {
							profileImage: profileImageUrl,
							profileImageId: twoFAUser.profileImageId || null,
						},
						registration: new Date().toISOString(),
						status: true,
						$createdAt: new Date().toISOString(),
						$updatedAt: new Date().toISOString(),
						labels: [],
						passwordUpdate: new Date().toISOString(),
						phone: "",
						accessedAt: new Date().toISOString(),
						mfa: false,
						targets: [],
					} as AuthenticatedUser;
					// Ensure complete serialization by parsing and stringifying
					const serializedUser = JSON.parse(
						JSON.stringify(convertedUser),
					) as AuthenticatedUser;
					setUser(serializedUser);
				}
			} else {
				// For session-based user
				const sessionUser = await getSessionUser();
				if (sessionUser) {
					setUser(sessionUser);
				}
			}
		} catch (error) {
			console.error("Failed to refresh user:", error);
		}
	};

	const logout = async (reason: "manual" | "inactivity" = "manual") => {
		// Clear client-side state immediately for instant logout
		setUser(null);
		setIsSessionValid(false);

		// Clear any client-side storage immediately
		localStorage.removeItem("session");
		localStorage.removeItem(CACHED_USER_STORAGE_KEY);
		sessionStorage.clear();

		// Redirect immediately without waiting for API call
		const redirectUrl =
			reason === "inactivity" ? "/sign-in?reason=inactivity" : "/sign-in";

		// Fire and forget - don't wait for API response
		fetch("/api/auth/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ reason }),
			keepalive: true, // Ensure request completes even after navigation
		}).catch((error) => {
			// Silently handle errors - logout should succeed even if API fails
			if (process.env.NODE_ENV === "development") {
				console.warn("Logout API call failed (non-critical):", error);
			}
		});

		// Redirect immediately
		window.location.href = redirectUrl;
	};

	// Always render the same structure to maintain consistent hook calls
	return (
		<AuthContext.Provider
			value={{ user, setUser, loading, logout, isSessionValid, refreshUser }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);

	// Always return the same structure, but conditionally show data
	if (context) {
		return context;
	}

	return {
		user: null,
		setUser: () => undefined,
		loading: true,
		logout: async () => undefined,
		isSessionValid: false,
		refreshUser: async () => undefined,
	};
};
