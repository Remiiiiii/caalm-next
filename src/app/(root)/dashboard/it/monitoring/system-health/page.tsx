/**
 * System Health Page
 */

"use client";

export default function SystemHealthPage() {
	return (
		<div className="page-container py-6">
			<div className="glass-card w-full overflow-hidden">
				<div className="glass-card-cap" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							System Health
						</h2>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<p className="text-slate-600">System health content coming soon...</p>
				</div>
			</div>
		</div>
	);
}
