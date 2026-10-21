import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ContractAssistantChat } from "@/components/contract-assistant/ContractAssistantChat";

beforeAll(() => {
	HTMLElement.prototype.scrollIntoView = () => {};
});

const userMessage = {
	id: "u1",
	role: "user" as const,
	text: "What is the NSN?",
};

describe("ContractAssistantChat follow-ups", () => {
	it("hides follow-up questions while the assistant is thinking", () => {
		render(
			<ContractAssistantChat
				messages={[userMessage]}
				starterPrompts={[]}
				suggestedQuestions={["What is the designated quantity?"]}
				loading
				onSend={vi.fn()}
			/>,
		);

		expect(screen.getByText("Thinking…")).toBeInTheDocument();
		expect(screen.queryByText("Follow-up questions")).not.toBeInTheDocument();
	});

	it("shows follow-up questions after the response", () => {
		render(
			<ContractAssistantChat
				messages={[
					userMessage,
					{ id: "a1", role: "assistant", text: "The NSN is 123." },
				]}
				starterPrompts={[]}
				suggestedQuestions={["What is the designated quantity?"]}
				onSend={vi.fn()}
			/>,
		);

		expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
		expect(screen.getByText("Follow-up questions")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "What is the designated quantity?" }),
		).toBeInTheDocument();
	});
});
