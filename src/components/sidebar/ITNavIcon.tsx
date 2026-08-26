"use client";

import type { LucideIcon } from "lucide-react";
import {
	Activity,
	AppWindow,
	BadgeCheck,
	BarChart3,
	Bell,
	BookMarked,
	BookOpen,
	Building,
	Building2,
	CalendarClock,
	CircleAlert,
	CirclePlus,
	ClipboardCheck,
	Clock,
	Crown,
	Database,
	DatabaseBackup,
	Eye,
	FileText,
	Gauge,
	GitBranch,
	GitFork,
	Hammer,
	HardDrive,
	HeartPulse,
	History,
	Inbox,
	Info,
	KeyRound,
	LayoutDashboard,
	Lock,
	Map as MapIcon,
	Monitor,
	Network,
	Newspaper,
	Plug,
	Rocket,
	ScrollText,
	Search,
	SearchCode,
	Server,
	Settings,
	Shield,
	Siren,
	TableProperties,
	Tag,
	Ticket,
	TrendingUp,
	TriangleAlert,
	UserCog,
	Users,
} from "lucide-react";
import type { ITNavIconKey } from "@/constants/it-navigation";
import { cn } from "@/lib/utils";

const IT_LUCIDE_ICONS: Record<ITNavIconKey, LucideIcon> = {
	layoutDashboard: LayoutDashboard,
	server: Server,
	monitor: Monitor,
	hardDrive: HardDrive,
	activity: Activity,
	barChart3: BarChart3,
	shield: Shield,
	heartPulse: HeartPulse,
	gauge: Gauge,
	triangleAlert: TriangleAlert,
	network: Network,
	appWindow: AppWindow,
	gitBranch: GitBranch,
	hammer: Hammer,
	rocket: Rocket,
	tag: Tag,
	badgeCheck: BadgeCheck,
	gitFork: GitFork,
	map: MapIcon,
	ticket: Ticket,
	searchCode: SearchCode,
	bookOpen: BookOpen,
	keyRound: KeyRound,
	scrollText: ScrollText,
	clipboardCheck: ClipboardCheck,
	lock: Lock,
	siren: Siren,
	database: Database,
	tableProperties: TableProperties,
	search: Search,
	fileText: FileText,
	info: Info,
	circleAlert: CircleAlert,
	history: History,
	calendarClock: CalendarClock,
	bookMarked: BookMarked,
	users: Users,
	userCog: UserCog,
	building2: Building2,
	trendingUp: TrendingUp,
	settings: Settings,
	plug: Plug,
	bell: Bell,
	databaseBackup: DatabaseBackup,
	clock: Clock,
	crown: Crown,
	building: Building,
	eye: Eye,
	newspaper: Newspaper,
	circlePlus: CirclePlus,
	inbox: Inbox,
};

type ITNavIconProps = {
	name: ITNavIconKey;
	className?: string;
	size?: number;
};

export function ITNavIcon({
	name,
	className,
	size = 18,
}: ITNavIconProps) {
	const Icon = IT_LUCIDE_ICONS[name] ?? LayoutDashboard;
	return (
		<Icon
			className={cn("shrink-0", className)}
			size={size}
			strokeWidth={1.75}
			aria-hidden
		/>
	);
}
