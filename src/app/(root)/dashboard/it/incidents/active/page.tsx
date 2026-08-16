export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function ActiveIncidentsRedirect() {
	redirect("/dashboard/it/issuehistory");
}
