export const FRAMEWORK_QUESTION_TEMPLATES: Record<string, string[]> = {
	"SOC 2": [
		"Describe the last user access review. Who signed off and where is the log?",
		"Show me how privileged access is approved today.",
	],
	"ISO 27001": [
		"Walk me through the last incident that touched this control family.",
		"Show me evidence that awareness training ran for in-scope staff.",
	],
	default: [
		"Tell me about the last time this control failed an audit. What changed?",
	],
};