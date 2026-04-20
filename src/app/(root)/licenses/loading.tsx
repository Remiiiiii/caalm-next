import { LoadingSpinner } from "@/components/ui/loading";

export default function Loading() {
	return (
		<div className="flex items-center justify-center h-full min-h-[400px]">
			<div className="text-center">
				<LoadingSpinner size="lg" />
				<p className="text-gray-600 mt-4">Loading licenses...</p>
			</div>
		</div>
	);
}
