import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

/** Always-on CAALM tweaks (safe in any config object). */
const baseRuleTweaks = {
	"@next/next/no-img-element": "off",
	"react/no-unescaped-entities": "off",
};

/** Soften only when that plugin/rule already exists on the config object. */
const softWarnIfPresent = [
	"react-hooks/set-state-in-effect",
	"react-hooks/exhaustive-deps",
	"react-hooks/use-memo",
	"react-hooks/refs",
	"react-hooks/preserve-manual-memoization",
	"react-hooks/static-components",
	"react-hooks/purity",
	"react-hooks/immutability",
	"@next/next/no-location-assign-relative-destination",
	"@next/next/no-html-link-for-pages",
	"@next/next/no-before-interactive-script-outside-document",
	"import/no-anonymous-default-export",
	"react/display-name",
];

/**
 * Fail-closed CI: real errors fail the job.
 * Soften noisy Hooks/Next rules only on configs that already define them.
 * See docs/internal/ci-lint-strictness.md.
 */
/** @type {import("eslint").Linter.Config[]} */
const config = [
	{
		ignores: [
			"node_modules/**",
			".next/**",
			"out/**",
			"build/**",
			"dist/**",
			".agents/**",
			"graft/**",
			"coverage/**",
			"playwright-report/**",
			"test-results/**",
			".eslint-report.json",
		],
	},
	...nextCoreWebVitals.map((entry) => {
		if (!entry || typeof entry !== "object") return entry;
		const rules = { ...(entry.rules || {}), ...baseRuleTweaks };
		for (const ruleId of softWarnIfPresent) {
			if (rules[ruleId] !== undefined) {
				rules[ruleId] = "warn";
			}
		}
		return { ...entry, rules };
	}),
];

export default config;
