import { redirect } from "next/navigation";

export default function AuditsIndexPage() {
	redirect("/audits/status");
}
