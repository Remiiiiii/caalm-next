"use client";

import ApprovalFlowConnector from "@/components/contracts/approval/ApprovalFlowConnector";
import ApprovalFlowNode from "@/components/contracts/approval/ApprovalFlowNode";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";

interface ContractApprovalFlowCanvasProps {
	workflow: ApprovalWorkflowViewerPayload;
}

export default function ContractApprovalFlowCanvas({
	workflow,
}: ContractApprovalFlowCanvasProps) {
	const { steps, currentStepIndex, department, subDepartment } = workflow;

	const hasParallel = steps.some((step) => step.parallelGroupId);

	return (
		<div className="landing-grid-bg w-full overflow-x-auto rounded-xl border border-slate-200/70 bg-slate-50/80 pb-2">
			{hasParallel ? (
				<p className="px-4 pt-3 text-xs text-slate-500">
					Steps that share a group can be reviewed at the same time.
				</p>
			) : null}
			<div className="flex min-w-min items-stretch gap-0 px-3 py-4 sm:px-4">
				{steps.map((step, index) => {
					const filled = index < currentStepIndex;
					const isCurrent = index === currentStepIndex;
					const connectorCurrent = index === currentStepIndex - 1 || isCurrent;
					return (
						<div key={step.id} className="flex items-center">
							<ApprovalFlowNode
								step={step}
								isCurrent={isCurrent}
								department={department}
								subDepartment={subDepartment}
								frozen={workflow.workflowFrozen}
							/>
							{index < steps.length - 1 ? (
								<ApprovalFlowConnector
									filled={filled}
									current={connectorCurrent && !filled}
								/>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}
