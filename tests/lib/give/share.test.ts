import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildGivePageEmbedSnippet,
	buildGivePageShareUrl,
	buildGiveShareEmailBody,
	buildGiveShareEmailSubject,
	buildMailtoGiveShareUrl,
	slugifyUtmCampaign,
} from "@/lib/give/share";

describe("give share helpers", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("builds absolute URLs with UTM params", () => {
		vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.org");
		expect(buildGivePageShareUrl("acme-foundation")).toBe(
			"https://app.example.org/give/acme-foundation",
		);
		expect(
			buildGivePageShareUrl("acme-foundation", {
				utm_source: "email",
				utm_medium: "caalm",
				utm_campaign: "spring-appeal",
			}),
		).toBe(
			"https://app.example.org/give/acme-foundation?utm_source=email&utm_medium=caalm&utm_campaign=spring-appeal",
		);
	});

	it("builds email subject and body", () => {
		expect(buildGiveShareEmailSubject("Acme Foundation")).toBe(
			"Support Acme Foundation",
		);
		const body = buildGiveShareEmailBody(
			"Acme Foundation",
			"https://app.example.org/give/acme",
		);
		expect(body).toContain("Acme Foundation");
		expect(body).toContain("https://app.example.org/give/acme");
	});

	it("builds mailto with encoded subject and body", () => {
		const href = buildMailtoGiveShareUrl({
			to: "donor@example.org",
			orgName: "Acme",
			shareUrl: "https://app.example.org/give/acme",
		});
		expect(href.startsWith("mailto:donor%40example.org?")).toBe(true);
		expect(href).toContain("subject=");
		expect(href).toContain("body=");
	});

	it("builds iframe embed snippet", () => {
		const snippet = buildGivePageEmbedSnippet(
			'https://app.example.org/give/acme?x="1"',
		);
		expect(snippet).toContain("<iframe");
		expect(snippet).toContain("&quot;");
		expect(snippet).toContain("https://app.example.org/give/acme?x=&quot;1&quot;");
	});

	it("slugifies UTM campaign tags", () => {
		expect(slugifyUtmCampaign(" Spring Appeal 2026 ")).toBe(
			"spring-appeal-2026",
		);
	});
});
