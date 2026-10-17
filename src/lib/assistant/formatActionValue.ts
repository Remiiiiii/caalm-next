/**
 * Turn any tool/result value into readable UI text.
 * Never returns "[object Object]".
 */

export function formatActionValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return "";
		return value
			.map((item) => formatActionValue(item))
			.filter(Boolean)
			.join(", ");
	}
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		// Prefer common display keys on domain objects (task, event, user, …)
		for (const key of [
			"title",
			"name",
			"fullName",
			"label",
			"summary",
			"email",
		]) {
			const hit = record[key];
			if (typeof hit === "string" && hit.trim()) return hit.trim();
		}
		const parts = Object.entries(record)
			.filter(([k, v]) => {
				if (v === null || v === undefined) return false;
				if (k.startsWith("$")) return false;
				if (/^(id|eventId|orgId|userId|href)$/i.test(k)) return false;
				return true;
			})
			.slice(0, 6)
			.map(([k, v]) => {
				const label = k
					.replace(/([A-Z])/g, " $1")
					.replace(/^./, (c) => c.toUpperCase())
					.trim();
				const nested = formatActionValue(v);
				return nested ? `${label}: ${nested}` : "";
			})
			.filter(Boolean);
		return parts.join(" · ");
	}
	return String(value);
}

/** Flatten nested result bags like `{ task: { title, … } }` into field rows. */
export function flattenResultFields(
	result: Record<string, unknown>,
	hiddenKeys: Set<string>,
): Array<{ label: string; value: string; raw: unknown }> {
	const rows: Array<{ label: string; value: string; raw: unknown }> = [];

	const pushEntry = (key: string, value: unknown) => {
		if (value === undefined || value === null) return;
		if (hiddenKeys.has(key) || hiddenKeys.has(key.toLowerCase())) return;
		if (Array.isArray(value) && value.length === 0) return;

		// Nested domain object → expand one level
		if (
			typeof value === "object" &&
			!Array.isArray(value) &&
			!(value instanceof Date)
		) {
			const nested = value as Record<string, unknown>;
			const nestedEntries = Object.entries(nested).filter(([nk, nv]) => {
				if (nv === undefined || nv === null) return false;
				if (nk.startsWith("$")) return false;
				if (hiddenKeys.has(nk) || hiddenKeys.has(nk.toLowerCase())) return false;
				return true;
			});
			if (nestedEntries.length > 0) {
				for (const [nk, nv] of nestedEntries.slice(0, 8)) {
					const label = nk
						.replace(/([A-Z])/g, " $1")
						.replace(/^./, (c) => c.toUpperCase())
						.trim();
					const display = formatActionValue(nv);
					if (display) rows.push({ label, value: display, raw: nv });
				}
				return;
			}
		}

		const label = key
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (c) => c.toUpperCase())
			.trim();
		const display = formatActionValue(value);
		if (display) rows.push({ label, value: display, raw: value });
	};

	for (const [key, value] of Object.entries(result)) {
		pushEntry(key, value);
		if (rows.length >= 10) break;
	}
	return rows.slice(0, 10);
}
