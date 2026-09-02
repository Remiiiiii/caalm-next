import { listClauses } from "@/lib/clauses/clause-library.service";
import {
	compareClauseWithGemini,
	extractClausesWithGemini,
} from "@/lib/playbook/compare-with-gemini";
import { scorePlaybookDeviations } from "@/lib/playbook/deviation-scoring";
import type { Clause } from "@/types/clauses";
import type {
	DeviationCompareFn,
	DeviationReport,
	ExtractedClauseInput,
} from "@/types/playbook-deviations";

export type ListPlaybookStandardsFn = (filters: {
	orgId: string;
	status: "active";
	currentOnly: true;
}) => Promise<Clause[]>;

export type ExtractClausesFn = (content: string) => Promise<ExtractedClauseInput[]>;

export async function scoreOrgContractDeviations(input: {
	orgId: string;
	clauses?: ExtractedClauseInput[];
	content?: string;
	listStandards?: ListPlaybookStandardsFn;
	compare?: DeviationCompareFn;
	extractClauses?: ExtractClausesFn;
}): Promise<DeviationReport> {
	const extracted = input.clauses?.filter((row) => row.body.trim()) ?? [];
	const clauses =
		extracted.length > 0
			? extracted
			: input.content?.trim()
				? await (input.extractClauses ?? extractClausesWithGemini)(
						input.content,
					)
				: [];

	const listStandards = input.listStandards ?? listClauses;
	const standards = await listStandards({
		orgId: input.orgId,
		status: "active",
		currentOnly: true,
	});

	return scorePlaybookDeviations({
		extractedClauses: clauses,
		standards,
		compare: input.compare ?? compareClauseWithGemini,
	});
}
