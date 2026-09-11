"use client";

import { useState } from "react";
import ContractApprovalFlowDialog from "@/components/contracts/approval/ContractApprovalFlowDialog";
import { ContractLifecycleStatusBadge } from "@/components/contracts/ContractLifecycleStatusBadge";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { getContractLifecycleDisplay } from "@/lib/contracts/contractLifecycleDisplay";
import type { UIFileDoc } from "@/types/files";

interface ContractApprovalStatusCellProps {
	file: UIFileDoc;
	onRefresh?: () => void;
}

export function ContractApprovalStatusCell({
	file,
	onRefresh,
}: ContractApprovalStatusCellProps) {
	const { permissions, settled } = usePermissions();
	const [open, setOpen] = useState(false);
	const display = getContractLifecycleDisplay(file);
	const hasWorkflowPermission =
		permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
		permissions.includes(PERMISSIONS.CONTRACTS.REVIEW) ||
		permissions.includes(PERMISSIONS.CONTRACTS.APPROVE);
	// Allow click while permissions load; after settle, require VIEW/REVIEW/APPROVE.
	const canOpen = display.clickable && (!settled || hasWorkflowPermission);
	const contractId = String(file.contractId || file.$id);

	const stopRowPreview = (e: React.SyntheticEvent) => {
		e.stopPropagation();
	};

	return (
		<div
			className="relative z-10"
			onClick={stopRowPreview}
			onMouseDown={stopRowPreview}
			onPointerDown={stopRowPreview}
			onKeyDown={stopRowPreview}
		>
			<ContractLifecycleStatusBadge
				file={file}
				clickable={canOpen}
				onClick={() => setOpen(true)}
			/>
			{canOpen ? (
				<ContractApprovalFlowDialog
					open={open}
					onOpenChange={(next) => {
						setOpen(next);
						if (!next) onRefresh?.();
					}}
					contractId={contractId}
					contractName={file.contractName || file.name}
				/>
			) : null}
		</div>
	);
}
