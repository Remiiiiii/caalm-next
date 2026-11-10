import type { AssistantInputForm } from "@/components/assistant/assistantTypes";
import type { DirectoryInvitee } from "@/lib/assistant/directoryInvite";
import { formatInviteNamesForAnswer } from "@/lib/assistant/invitePeopleField";
import { inviteUsersForm } from "@/lib/assistant/inputForm";
import { formatInvitePeopleLine } from "@/lib/assistant/parseInviteDraft";

export type NextInviteFormPayload = {
	answer: string;
	inputForm: AssistantInputForm;
};

/** Next form for everyone still unchecked after a confirmed invite batch. */
export function buildNextInviteForm(params: {
	remaining: DirectoryInvitee[];
	total: number;
}): NextInviteFormPayload {
	const remainingCount = params.remaining.length;
	if (remainingCount === 0) {
		return {
			answer: "All invites from this batch are done.",
			inputForm: inviteUsersForm(),
		};
	}

	const position = params.total - remainingCount + 1;

	if (remainingCount === 1) {
		const next = params.remaining[0]!;
		return {
			answer: `Next invite (**${position} of ${params.total}**): **${next.fullName}**. Choose their role and department. Nothing is sent until you Confirm.`,
			inputForm: inviteUsersForm({
				people: formatInvitePeopleLine([next]),
			}),
		};
	}

	return {
		answer: `Next batch: ${formatInviteNamesForAnswer(params.remaining)} still need access (**${remainingCount} left of ${params.total}**). Check who shares the next role and department. Leave anyone unchecked for another form after Confirm. Nothing is sent until you Confirm.`,
		inputForm: inviteUsersForm(
			{
				people: formatInvitePeopleLine(params.remaining),
			},
			params.remaining,
		),
	};
}
