/**
 * Opens a draft stub PR for a Todo Roadmap section and returns its number,
 * so the board can show a real linked PR the moment a section is generated
 * (same convention as the hand-opened PRs for the original 20 sections: a
 * one-line marker-file commit on `cursor/todo/{section}-{code}-*`, pushed and
 * opened via `gh pr create --draft`).
 *
 * Runs git/gh in a throwaway worktree, never the server's own working tree —
 * this route can fire while a developer has uncommitted changes checked out.
 */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { RoadmapCatalogSection } from "../types";
import {
	buildTodoSectionPrBody,
	todoBranchName,
	todoPullRequestTitle,
} from "./todo-pr-body";

const execFileAsync = promisify(execFile);

export class TodoStubPrError extends Error {}

export function parsePrNumberFromUrl(prUrl: string): number {
	const match = prUrl.match(/\/pull\/(\d+)/);
	if (!match) {
		throw new TodoStubPrError(`Could not parse PR number from: ${prUrl}`);
	}
	return Number(match[1]);
}

async function run(cmd: string, args: string[], cwd: string): Promise<string> {
	const { stdout } = await execFileAsync(cmd, args, { cwd });
	return stdout.trim();
}

export async function openTodoStubPr(
	section: RoadmapCatalogSection,
	repoRoot: string,
): Promise<number> {
	const task = section.tasks[0];
	if (!task) {
		throw new TodoStubPrError(`Section ${section.sectionNumber} has no task`);
	}
	const branch = todoBranchName(section);
	const title = todoPullRequestTitle(section);
	const body = buildTodoSectionPrBody(section);

	await run("git", ["fetch", "origin", "main"], repoRoot);

	const worktreeDir = await mkdtemp(path.join(tmpdir(), "caalm-todo-pr-"));
	try {
		await run(
			"git",
			["worktree", "add", "-b", branch, worktreeDir, "origin/main"],
			repoRoot,
		);

		const markerPath = path.join(
			"src/lib/roadmap/todo-batches",
			`s${String(section.sectionNumber).padStart(2, "0")}.ts`,
		);
		const markerAbsPath = path.join(worktreeDir, markerPath);
		await mkdir(path.dirname(markerAbsPath), { recursive: true });
		const constName = `TODO_SECTION_${String(section.sectionNumber).padStart(2, "0")}`;
		await writeFile(
			markerAbsPath,
			`/**\n * Todo Roadmap ticket — implement this task on this PR branch.\n * Section ${section.sectionNumber}: ${section.title}\n */\nexport const ${constName} = {\n\tsectionNumber: ${section.sectionNumber},\n\tsectionTitle: ${JSON.stringify(section.title)},\n\ttaskCode: ${JSON.stringify(task.taskCode)},\n\tmarkerPath: ${JSON.stringify(markerPath)},\n\tticket: true,\n} as const;\n`,
			"utf8",
		);

		await run("git", ["add", markerPath], worktreeDir);
		await run("git", ["commit", "-m", title], worktreeDir);
		await run("git", ["push", "-u", "origin", branch], worktreeDir);

		const bodyFile = path.join(worktreeDir, ".todo-pr-body.md");
		await writeFile(bodyFile, body, "utf8");

		const prUrl = await run(
			"gh",
			[
				"pr",
				"create",
				"--base",
				"main",
				"--head",
				branch,
				"--title",
				title,
				"--body-file",
				bodyFile,
				"--draft",
			],
			worktreeDir,
		);

		return parsePrNumberFromUrl(prUrl);
	} finally {
		await run(
			"git",
			["worktree", "remove", "--force", worktreeDir],
			repoRoot,
		).catch(() => {});
		await rm(worktreeDir, { recursive: true, force: true }).catch(() => {});
	}
}
