import { LoadingSpinner } from "@/components/ui/loading";

export default function Loading() {
	return (
		<div className="flex h-full min-h-[400px] items-center justify-center">
			<LoadingSpinner size="md" label="Loading..." className="!p-0" />
		</div>
	);
}
