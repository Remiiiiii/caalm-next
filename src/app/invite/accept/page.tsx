import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading";
import AcceptInviteClient from "./AcceptInviteClient";

export default function AcceptInvitePage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[200px] items-center justify-center">
					<LoadingSpinner size="md" label="Loading..." />
				</div>
			}
		>
			<AcceptInviteClient />
		</Suspense>
	);
}
