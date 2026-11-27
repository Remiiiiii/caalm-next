import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom checkbox for the voice-interview consent modal — not a native
 * `<input type="checkbox">` rendering its own box. Unchecked is a hairline
 * outline; checked adopts the window's "toolbar surface" (same background
 * as the control bar / live overlay), no teal fill. Hover only lightens the
 * border — no other hover effect, per the finalized component spec.
 */
export function ConsentCheckbox({
	id,
	label,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label htmlFor={id} className="ckbox-row">
			<span className="ckbox-box-wrap">
				<input
					id={id}
					type="checkbox"
					className="ckbox-input"
					checked={checked}
					onChange={(e) => onChange(e.target.checked)}
				/>
				<span className={cn("ckbox-box", checked && "checked")} aria-hidden>
					{checked ? (
						<span className="ckbox-check">
							<Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
						</span>
					) : null}
				</span>
			</span>
			<span className="ckbox-label">{label}</span>
		</label>
	);
}
