"use client";

import { createContext, useContext, useMemo, useState } from "react";

type TicketSheetState = { open: boolean; setOpen: (open: boolean) => void };

const TicketSheetContext = createContext<TicketSheetState | null>(null);

/** Lets the page header's "Show details" button open the sheet inside TicketDetail. */
export function TicketSheetProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const value = useMemo(() => ({ open, setOpen }), [open]);
	return (
		<TicketSheetContext.Provider value={value}>
			{children}
		</TicketSheetContext.Provider>
	);
}

export function useTicketSheet(): TicketSheetState {
	const ctx = useContext(TicketSheetContext);
	if (!ctx) throw new Error("useTicketSheet needs a TicketSheetProvider");
	return ctx;
}
