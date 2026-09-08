import type { ContractAnalysis } from "@/lib/ai-contract-analyzer";

export type PdfPageText = {
	page: number;
	text: string;
};

export type ContractCitation = {
	id: number;
	pages: number[];
	quote: string;
};

export type ContractStarterPrompt = {
	label: string;
	prompt: string;
};

export type ContractAssistantAnalyzeResult = {
	summaryMarkdown: string;
	starterPrompts: ContractStarterPrompt[];
	suggestedQuestions: string[];
	citations: ContractCitation[];
	analysis?: ContractAnalysis;
};

export type ContractAssistantAnswerResult = {
	answerMarkdown: string;
	citations: ContractCitation[];
	suggestedQuestions: string[];
};

export const CONTRACT_ASSISTANT_FALLBACK_STARTERS: ContractStarterPrompt[] = [
	{
		label: "Summarize key terms",
		prompt:
			"Summarize the key terms, parties, and obligations in this contract.",
	},
	{
		label: "Identify compliance requirements",
		prompt:
			"Identify compliance requirements, reporting duties, and regulatory clauses in this contract.",
	},
	{
		label: "Stress-test missing safeguards",
		prompt:
			"Stress-test this contract for missing safeguards, weak controls, and gaps in risk allocation.",
	},
	{
		label: "Extract payment and signature details",
		prompt:
			"Extract payment terms, amounts, invoicing rules, and signature or execution details from this contract.",
	},
];

export const CONTRACT_ASSISTANT_FALLBACK_QUESTIONS = [
	"What deadlines drive performance risk in this contract?",
	"Which clauses should be negotiated first?",
	"What happens if a party misses a required notice or deliverable?",
];
