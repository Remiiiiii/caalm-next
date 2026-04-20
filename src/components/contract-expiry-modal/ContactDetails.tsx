"use client";

import { motion } from "framer-motion";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import type { UIFileDoc } from "@/types/files";

interface ContactDetailsProps {
	contract: UIFileDoc;
}

export default function ContactDetails({ contract }: ContactDetailsProps) {
	// Access counterparty fields (they exist but aren't typed in UIFileDoc)
	const counterparty = contract as UIFileDoc & {
		counterpartyLegalName?: string;
		counterpartyContactTitle?: string;
		counterpartyContactEmail?: string;
		counterpartyContactPhone?: string;
		counterpartyAddress?: string;
	};

	const hasContactInfo =
		counterparty.counterpartyLegalName ||
		counterparty.counterpartyContactEmail ||
		counterparty.counterpartyContactPhone ||
		counterparty.counterpartyAddress;

	if (!hasContactInfo) {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 1.8, duration: 0.5 }}
			className="relative z-20 mt-8 glass-card p-6 w-[930px] ml-24"
		>
			<div className="flex items-center gap-2 mb-4">
				<Building2 className="w-5 h-5 text-slate-700" />
				<h3 className="text-xl font-semibold text-slate-800">
					Vendor Contact Information
				</h3>
			</div>

			<div className="space-y-3">
				{counterparty.counterpartyLegalName && (
					<div className="text-slate-800">
						<div className="font-semibold text-lg mb-1">
							{counterparty.counterpartyLegalName}
						</div>
						{counterparty.counterpartyContactTitle && (
							<div className="text-slate-600 text-sm">
								{counterparty.counterpartyContactTitle}
							</div>
						)}
					</div>
				)}

				{counterparty.counterpartyContactEmail && (
					<div className="flex items-center gap-2">
						<Mail className="w-4 h-4 text-slate-600" />
						<a
							href={`mailto:${counterparty.counterpartyContactEmail}`}
							className="text-blue-600 hover:text-blue-700 underline transition-colors"
						>
							{counterparty.counterpartyContactEmail}
						</a>
					</div>
				)}

				{counterparty.counterpartyContactPhone && (
					<div className="flex items-center gap-2">
						<Phone className="w-4 h-4 text-slate-600" />
						<a
							href={`tel:${counterparty.counterpartyContactPhone}`}
							className="text-blue-600 hover:text-blue-700 underline transition-colors"
						>
							{counterparty.counterpartyContactPhone}
						</a>
					</div>
				)}

				{counterparty.counterpartyAddress && (
					<div className="flex items-start gap-2">
						<MapPin className="w-4 h-4 text-slate-600 mt-1 flex-shrink-0" />
						<div className="text-slate-700 text-sm">
							{counterparty.counterpartyAddress}
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
