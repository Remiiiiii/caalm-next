import type { MetadataRoute } from "next";
import {
	PUBLIC_EXACT_PATHS,
	PUBLIC_ROUTE_PREFIXES,
} from "@/lib/auth/protectedRoutes";

/**
 * Served natively by Next.js at /robots.txt. Rules are derived from the same
 * public-path allowlist the auth proxy enforces (protectedRoutes.ts), so
 * this can't drift into allowing crawlers into pages that just redirect
 * them to /sign-in anyway.
 */
export default function robots(): MetadataRoute.Robots {
	const exactAllow = [...PUBLIC_EXACT_PATHS].map((path) =>
		path === "/" ? "/$" : `${path}$`,
	);

	return {
		rules: {
			userAgent: "*",
			allow: [...exactAllow, ...PUBLIC_ROUTE_PREFIXES],
			disallow: "/",
		},
		sitemap: "https://caalmsolutions.com/sitemap.xml",
	};
}
