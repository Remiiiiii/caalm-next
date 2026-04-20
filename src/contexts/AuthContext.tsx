"use client";

import type { Models } from "appwrite";
import { usePathname } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { normalizeUserRole } from "@/constants/rbac";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getCurrentUserFrom2FA } from "@/lib/actions/user.actions";

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

	useEffect(() => {
		setMounted(true);

		const checkSession = async () => {
			try {
				setLoading(true);

				// Optimize: Check localStorage first for cached user data to show UI immediately
				if (typeof window !== "undefined") {
					const cachedUser = localStorage.getItem("cached_user");
					if (cachedUser) {
						try {
							const parsed = JSON.parse(cachedUser);
							// Only use cache if it's less than 5 minutes old
							if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) {
								setUser(parsed.user);
								setIsSessionValid(true);
								setLoading(false);
								// Continue with fresh check in background
							}
						} catch {
							// Invalid cache, continue with fresh check
						}
					}
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
								"cached_user",
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
					const isDashboardRoute =
						pathname &&
						(pathname.startsWith("/dashboard") ||
							pathname.startsWith("/analytics") ||
							pathname.startsWith("/contracts") ||
							pathname.startsWith("/my-contracts") ||
							pathname.startsWith("/settings") ||
							pathname.startsWith("/search") ||
							pathname.startsWith("/licenses") ||
							pathname.startsWith("/uploads") ||
							pathname.startsWith("/images") ||
							pathname.startsWith("/media") ||
							pathname.startsWith("/others") ||
							pathname.startsWith("/audits") ||
							pathname.startsWith("/team") ||
							pathname.startsWith("/calendar") ||
							pathname.startsWith("/company-news"));
					const isAuthRoute =
						pathname &&
						(pathname.startsWith("/sign-in") ||
							pathname.startsWith("/sign-up"));

					if (process.env.NODE_ENV === "development") {
						console.log(
							"AuthContext: Current pathname:",
							pathname,
							"isDashboardRoute:",
							isDashboardRoute,
							"isAuthRoute:",
							isAuthRoute,
						);
					}

					if (isAuthRoute) {
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

	const refreshUser = async () => {
		try {
			// Check if on dashboard route (2FA-based user)
			const isDashboardRoute =
				pathname?.startsWith("/dashboard") ||
				pathname?.startsWith("/file") ||
				pathname === "/";

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
		localStorage.removeItem("cached_user");
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
