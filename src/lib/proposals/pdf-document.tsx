import { Document, Text, View } from "@react-pdf/renderer";
import {
	Heading,
	MarkdownText,
	MUTED,
	PacketHeader,
	PacketPage,
	PacketTable,
	packet,
} from "@/lib/pdf/packet";
import type {
	Proposal,
	ProposalRequirement,
	ProposalSection,
} from "./types";

export function ProposalPdfDocument({
	orgName,
	proposal,
	requirements,
	sections,
}: {
	orgName: string;
	proposal: Proposal;
	requirements: ProposalRequirement[];
	sections: ProposalSection[];
}) {
	return (
		<Document>
			<PacketPage org={orgName} title={proposal.title}>
				<PacketHeader
					eyebrow="CAALM proposal draft"
					title={proposal.title}
					left={orgName}
					right={proposal.solicitationRef || "No notice ID"}
				/>
				<Text style={packet.small}>
					Human-reviewed first draft. Confirm every claim against the
					solicitation before submission.
				</Text>
				<Heading>Compliance matrix</Heading>
				<PacketTable
					columns={[
						{ header: "#", width: "8%" },
						{ header: "Section", width: "12%" },
						{ header: "Requirement", width: "55%" },
						{ header: "Response", width: "25%" },
					]}
					rows={requirements.map((row, index) => [
						String(index + 1),
						row.sourceSection,
						row.requirementText.slice(0, 180),
						row.responseType,
					])}
				/>
				{sections.map((section) => (
					<View key={section.$id}>
						<Heading>{section.heading}</Heading>
						<MarkdownText text={section.bodyMarkdown || "No draft yet."} />
					</View>
				))}
				<Text style={{ ...packet.small, color: MUTED, marginTop: 16 }}>
					Generated {new Date().toLocaleDateString("en-US")} · Status{" "}
					{proposal.status}
				</Text>
			</PacketPage>
		</Document>
	);
}
