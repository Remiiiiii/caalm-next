"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Visible only when NEXT_PUBLIC_APP_MODE=demo (client-readable flag).
 */
export default function DemoBanner() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		setShow(process.env.NEXT_PUBLIC_APP_MODE === "demo");
	}, []);

	if (!show) return null;

	return (
		<div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-sm flex items-center justify-center gap-2 z-50">
			<FlaskConical className="h-4 w-4 shrink-0 text-[#0f5384]" />
			<span>
				Sandbox demo — fictional data only. Changes expire after 7 days.
			</span>
		</div>
	);
}
