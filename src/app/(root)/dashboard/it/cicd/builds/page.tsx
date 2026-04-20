/**
 * Build History Page
 */

"use client";

export default function BuildsPage() {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
			<div className="glass-card w-full overflow-hidden">
				<div className="glass-card-cap" />
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Build History
						</h2>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<p className="text-slate-600">Build history content coming soon...</p>
				</div>
			</div>
		</div>
	);
}
