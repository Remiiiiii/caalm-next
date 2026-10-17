/**
 * Cross-platform ESLint runner (flat config: eslint.config.mjs).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eslintJs = path.join(root, "node_modules", "eslint", "bin", "eslint.js");

const env = { ...process.env };
delete env.ESLINT_USE_FLAT_CONFIG;

const result = spawnSync(
	process.execPath,
	[eslintJs, ".", ...process.argv.slice(2)],
	{
		stdio: "inherit",
		cwd: root,
		env,
	},
);

process.exit(result.status === null ? 1 : result.status);
