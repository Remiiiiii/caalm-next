import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { invalidateRoadmapOverviewCache } from "@/lib/roadmap/service";
import {
	addDynamicTodoSection,
	nextDynamicTodoSectionNumber,
} from "@/lib/roadmap/todo/dynamic-sections";
import {
	generateTodoSectionFromPrompt,
	TodoSectionGenerationError,
} from "@/lib/roadmap/todo/generate-section";
import {
	openTodoStubPr,
	TodoStubPrError,
} from "@/lib/roadmap/todo/open-stub-pr";
import { syncTodoSectionsFromGitHub } from "@/lib/roadmap/todo/sync-from-github";
import { TODO_ROADMAP_CATALOG } from "@/lib/roadmap/todo/todo-catalog";
import {
	buildTodoSectionPrBody,
	todoPullRequestTitle,
} from "@/lib/roadmap/todo/todo-pr-body";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_ROADMAP,
	});
	if (denied) return denied;

	try {
		const body = await request.json();
		const { prompt } = body as { prompt?: unknown };
		if (typeof prompt !== "string" || !prompt.trim()) {
			return NextResponse.json(
				{ error: "prompt is required" },
				{ status: 400 },
			);
		}

		// GitHub is the source of truth for anything beyond the static 20 —
		// refresh before picking the next section number so numbering stays
		// correct even on a fresh process that hasn't rendered the board yet.
		await syncTodoSectionsFromGitHub().catch(() => {});

		const generated = await generateTodoSectionFromPrompt(prompt.trim());
		const sectionNumber = nextDynamicTodoSectionNumber(
			TODO_ROADMAP_CATALOG.length,
		);
		const taskCode = `${sectionNumber}.1`;
		const section = {
			...generated,
			sectionNumber,
			sourceRef: "Generated from a prompt on the Todo Roadmap page",
			tasks: [
				{
					...generated.tasks[0]!,
					taskCode,
					testSuiteRef: `tests/roadmap/todo/${taskCode.replace(/\./g, "-")}.test.ts`,
				},
			],
		};

		const prNumber = await openTodoStubPr(section, process.cwd());
		section.linkedPrNumbers = [prNumber];
		section.tasks[0]!.linkedPrNumber = prNumber;

		// Optimistic — shows up this instant, ahead of GitHub's own PR-list
		// cache; the next sync (service.ts's getOverview) reconciles it with
		// GitHub's real copy once that cache catches up.
		addDynamicTodoSection(section);
		invalidateRoadmapOverviewCache("todo");

		return NextResponse.json({
			section,
			prNumber,
			prTitle: todoPullRequestTitle(section),
			prBody: buildTodoSectionPrBody(section),
		});
	} catch (error) {
		if (error instanceof TodoSectionGenerationError) {
			return NextResponse.json({ error: error.message }, { status: 422 });
		}
		if (error instanceof TodoStubPrError) {
			return NextResponse.json(
				{
					error: `Section generated but opening the PR failed: ${error.message}`,
				},
				{ status: 502 },
			);
		}
		console.error("[SERVER] roadmap/todo/generate-section:", error);
		return NextResponse.json(
			{ error: "Failed to generate section" },
			{ status: 500 },
		);
	}
}
