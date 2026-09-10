import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading";
import SignDocumentClient from "./SignDocumentClient";

export default async function SignDocumentPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	return (
		<div className="min-h-screen bg-slate-100">
			<Suspense
				fallback={
					<div className="flex min-h-[240px] items-center justify-center">
						<LoadingSpinner size="md" label="Loading signing page..." />
					</div>
				}
			>
				<SignDocumentClient token={token} />
			</Suspense>
		</div>
	);
}
