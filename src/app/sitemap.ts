import type { MetadataRoute } from "next";

/** Served natively by Next.js at /sitemap.xml. */
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: "https://caalmsolutions.com",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
	];
}
