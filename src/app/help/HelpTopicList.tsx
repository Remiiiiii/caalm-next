"use client";

import Link from "next/link";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { DOCS_NAV } from "@/lib/docs/navigation";

export default function HelpTopicList() {
	return (
		<div className="mt-12">
			<h2 className="text-lg font-semibold text-slate-700">Browse by topic</h2>
			<Accordion
				type="multiple"
				className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
			>
				{DOCS_NAV.map((group) => (
					<AccordionItem
						key={group.id}
						value={group.id}
						className="border-slate-200 px-5 last:border-b-0"
					>
						<AccordionTrigger className="cursor-pointer py-5 text-left hover:no-underline [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-400">
							<span className="pr-4">
								<span className="block text-base font-semibold text-slate-800">
									{group.title}
								</span>
								<span className="mt-1 block text-sm font-normal text-slate-500">
									{group.description}
								</span>
							</span>
						</AccordionTrigger>
						<AccordionContent className="pb-5">
							<ul className="grid gap-1 sm:grid-cols-2">
								{group.items.map((item) => (
									<li key={item.slug}>
										<Link
											href={`/docs/${item.slug}`}
											className="block cursor-pointer rounded-md px-2 py-1.5 text-sm text-slate-700 transition-colors duration-200 hover:bg-blue-50 hover:text-[#0f5384]"
										>
											{item.title}
										</Link>
									</li>
								))}
							</ul>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
