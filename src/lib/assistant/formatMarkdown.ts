export function formatAssistantMarkdown(text: string): string {
	if (!text) return "";
	let formatted = text;
	formatted = formatted.replace(
		/\*\*([^*]+)\*\*/g,
		'<strong class="font-semibold text-slate-900">$1</strong>',
	);
	formatted = formatted.replace(
		/`([^`]+)`/g,
		'<code class="rounded bg-slate-200/80 px-1 py-0.5 text-xs">$1</code>',
	);
	formatted = formatted.replace(/\n/g, "<br />");
	return formatted;
}

export function formatRelativeTime(iso: string): string {
	const date = new Date(iso);
	const diffMs = Math.max(0, Date.now() - date.getTime());
	const mins = Math.floor(diffMs / (1000 * 60));
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo`;
	return `${Math.floor(months / 12)}y`;
}
