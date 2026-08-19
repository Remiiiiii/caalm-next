"use client";

import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export const FormattedDateTime = ({
	date,
	className,
}: {
	date: string;
	className?: string;
}) => {
	const timeZone = useOrgTimezone();
	return (
		<span className={cn("body-1 text-slate-700", className)}>
			{formatDateTime(date, timeZone)}
		</span>
	);
};
export const FormattedDate = ({
	date,
	className,
}: {
	date: string;
	className?: string;
}) => {
	const timeZone = useOrgTimezone();
	return (
		<span className={cn("body-2 text-slate-700", className)}>
			{formatDate(date, timeZone)}
		</span>
	);
};

export default FormattedDateTime;
