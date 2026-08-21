"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [organization, setOrganization] = useState("");
	const [message, setMessage] = useState("");

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const subject = encodeURIComponent(
			organization
				? `CAALM contact — ${organization}`
				: "CAALM contact",
		);
		const body = encodeURIComponent(
			`Name: ${name}\nEmail: ${email}\nOrganization: ${organization || "—"}\n\n${message}`,
		);
		window.location.href = `mailto:support@caalmsolutions.com?subject=${subject}&body=${body}`;
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<Label htmlFor="contact-name" className="text-sm text-slate-600">
					Full name
				</Label>
				<Input
					id="contact-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					className="mt-1"
					autoComplete="name"
				/>
			</div>
			<div>
				<Label htmlFor="contact-email" className="text-sm text-slate-600">
					Work email
				</Label>
				<Input
					id="contact-email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					className="mt-1"
					autoComplete="email"
				/>
			</div>
			<div>
				<Label htmlFor="contact-org" className="text-sm text-slate-600">
					Organization
				</Label>
				<Input
					id="contact-org"
					value={organization}
					onChange={(e) => setOrganization(e.target.value)}
					className="mt-1"
					autoComplete="organization"
				/>
			</div>
			<div>
				<Label htmlFor="contact-message" className="text-sm text-slate-600">
					How can we help?
				</Label>
				<Textarea
					id="contact-message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					required
					rows={5}
					className="mt-1"
				/>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<Button type="submit" className="primary-btn cursor-pointer px-3 sm:px-4">
					<Send className="h-4 w-4" />
					Send message
				</Button>
				<a
					href="mailto:support@caalmsolutions.com"
					className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#0f5384]"
				>
					<Mail className="h-4 w-4" />
					support@caalmsolutions.com
				</a>
			</div>
		</form>
	);
}
