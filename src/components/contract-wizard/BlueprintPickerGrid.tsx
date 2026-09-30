"use client";

import { useEffect, useState } from "react";
import {
	ContractAgreementMatrix,
	type AgreementMatrixView,
} from "@/components/contract-wizard/ContractAgreementMatrix";
import type { BlueprintCatalogEntry } from "@/lib/templates/blueprint-catalog";
import type { ContractTemplate } from "@/types/contract-templates";

type BlueprintPickerGridProps = {
	blueprints: BlueprintCatalogEntry[];
	templates: ContractTemplate[];
	selectedBlueprintId: string | null;
	selectedTemplateId: string | null;
	onSelectBlueprint: (blueprint: BlueprintCatalogEntry) => void;
	onSelectTemplate: (template: ContractTemplate) => void;
};

export function BlueprintPickerGrid({
	blueprints,
	templates,
	selectedBlueprintId,
	selectedTemplateId,
	onSelectBlueprint,
	onSelectTemplate,
}: BlueprintPickerGridProps) {
	const [view, setView] = useState<AgreementMatrixView>("builtin");
	const [query, setQuery] = useState("");

	useEffect(() => {
		setQuery("");
	}, [view]);

	return (
		<ContractAgreementMatrix
			view={view}
			onViewChange={setView}
			showViewToggle
			blueprints={blueprints}
			templates={templates.filter((row) => row.status === "published")}
			selectedBlueprintId={selectedBlueprintId}
			selectedTemplateId={selectedTemplateId}
			onSelectBlueprint={onSelectBlueprint}
			onSelectTemplate={onSelectTemplate}
			query={query}
			onQueryChange={setQuery}
		/>
	);
}
