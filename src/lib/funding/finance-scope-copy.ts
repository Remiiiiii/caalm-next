/** In-app copy: CAALM fund tracking + 990 worksheet — not payroll, GL, or e-file. */
export const FUNDING_OUT_OF_LANE = [
	"payroll",
	"990 e-file",
	"general ledger",
] as const;

export const FUNDING_SCOPE_HELP =
	"CAALM tracks restricted funds, grant budgets, and a Form 990 Part IX functional expense worksheet for your preparer. It is not payroll, not a general ledger, and does not offer 990 e-file.";

export const FORM_990_SETTINGS_INTRO =
	"Map obligation and gift categories to 990 Part IX worksheet buckets (program, management, fundraising). This produces a worksheet CSV for your accountant — not an IRS e-file.";
