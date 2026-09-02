"use client";

import { useState } from "react";
import { WeatherBriefingButton } from "@/components/dashboard-briefing/WeatherBriefingButton";
import { WeatherBriefingSheet } from "@/components/dashboard-briefing/WeatherBriefingSheet";

type WeatherBriefingLauncherProps = {
	location?: string;
	latitude?: number;
	longitude?: number;
};

export function WeatherBriefingLauncher({
	location,
	latitude,
	longitude,
}: WeatherBriefingLauncherProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<WeatherBriefingButton
				location={location}
				latitude={latitude}
				longitude={longitude}
				onClick={() => setOpen(true)}
			/>
			<WeatherBriefingSheet
				open={open}
				onOpenChange={setOpen}
				location={location}
				latitude={latitude}
				longitude={longitude}
			/>
		</>
	);
}
