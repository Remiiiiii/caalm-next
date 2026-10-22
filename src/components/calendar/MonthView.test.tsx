import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthView } from "@/components/calendar/MonthView";
import type { Note } from "@/lib/actions/notes.actions";

vi.mock("next/image", () => ({
	default: (props: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={props.src} alt={props.alt} />
	),
}));

const note = (id: string, date: string): Note => ({
	$id: id,
	title: `Note ${id}`,
	content: "<p>Body</p>",
	userId: "user-1",
	orgId: "org-1",
	calendarDate: date,
	calendarTime: "09:00",
	$createdAt: "2026-10-01T00:00:00.000Z",
	$updatedAt: "2026-10-01T00:00:00.000Z",
});

describe("MonthView pinned note icons", () => {
	it("renders sticky-notes for one pin and yellow-notes for two", () => {
		render(
			<MonthView
				currentMonth={new Date(2026, 9, 1)}
				events={[]}
				pinnedNotesByDate={{
					"2026-10-05": [note("a", "2026-10-05")],
					"2026-10-06": [note("b", "2026-10-06"), note("c", "2026-10-06")],
				}}
				canViewEventSensitiveDetails={() => true}
				onSelectDay={() => undefined}
				onEventClick={() => undefined}
				onOverflow={() => undefined}
			/>,
		);

		expect(
			screen.getByLabelText(/Open sticky note for Oct 5/i),
		).toHaveAttribute("aria-label", expect.stringContaining("Oct 5"));
		const single = screen.getByLabelText(/Open sticky note for Oct 5/i);
		expect(single.querySelector("img")?.getAttribute("src")).toBe(
			"/assets/icons/sticky-notes.svg",
		);

		const multi = screen.getByLabelText(/Open 2 sticky notes for Oct 6/i);
		expect(multi.querySelector("img")?.getAttribute("src")).toBe(
			"/assets/icons/yellow-notes.svg",
		);
	});
});
