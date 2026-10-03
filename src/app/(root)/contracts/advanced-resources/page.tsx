import type { Metadata } from "next";
import ContractsDisplay from "@/components/ContractsDisplay";

export const metadata: Metadata = {
	title: "Advanced Resources - Government Contracts | CAALM",
	description:
		"Search and explore government contract opportunities from SAM.gov",
};

export default function AdvancedResourcesPage() {
	return (
		<div className="relative min-h-screen">
			{/* Main Content */}
			<div className="relative z-10 p-6">
				<ContractsDisplay />
			</div>
		</div>
	);
}
