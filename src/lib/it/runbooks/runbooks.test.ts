import { describe, expect, it } from "vitest";
import { matchRunbooksForAlert } from "@/lib/it/runbooks/store";
import type { Runbook } from "@/lib/it/runbooks/types";

function rb(partial: Partial<Runbook> & Pick<Runbook, "title" | "service">): Runbook {
	const ts = new Date().toISOString();
	return {
		$id: partial.$id || "1",
		slug: partial.slug || "slug",
		summary: partial.summary || "",
		severity: partial.severity || "medium",
		status: partial.status || "published",
		symptoms: partial.symptoms || [],
		steps: partial.steps || [],
		verification: partial.verification || "",
		escalation: partial.escalation || "",
		ownerId: partial.ownerId || "u",
		orgId: partial.orgId || "o",
		tags: partial.tags || [],
		integrationKeys: partial.integrationKeys || [],
		$createdAt: ts,
		$updatedAt: ts,
		...partial,
		title: partial.title,
		service: partial.service,
	};
}

describe("matchRunbooksForAlert", () => {
	it("ranks service and symptom matches", () => {
		const items = [
			rb({
				$id: "auth",
				title: "Unstick sign-in",
				service: "auth",
				symptoms: ["Valid authenticator codes rejected"],
			}),
			rb({
				$id: "db",
				title: "Restore Appwrite",
				service: "appwrite",
				symptoms: ["API 5xx from Appwrite"],
			}),
		];

		const matched = matchRunbooksForAlert(items, {
			service: "appwrite",
			text: "API 5xx from Appwrite on contracts page",
		});

		expect(matched[0]?.$id).toBe("db");
	});

	it("ignores draft runbooks", () => {
		const items = [
			rb({
				$id: "draft",
				title: "Draft only",
				service: "auth",
				status: "draft",
				symptoms: ["login"],
			}),
		];
		expect(matchRunbooksForAlert(items, { text: "login" })).toHaveLength(0);
	});
});
