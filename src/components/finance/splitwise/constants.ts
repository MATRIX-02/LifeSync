import { Theme } from "@/src/context/themeContext";

export type DetailTab = "overview" | "expenses" | "members" | "activity";

export interface SplitWiseProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

export const COLORS = [
	"#A78BFA",
	"#F472B6",
	"#FB923C",
	"#FBBF24",
	"#34D399",
	"#22D3EE",
	"#60A5FA",
	"#818CF8",
	"#F87171",
	"#10B981",
];

export const GROUP_TYPES = [
	{ value: "trip", label: "Trip", icon: "airplane" },
	{ value: "home", label: "Home", icon: "home" },
	{ value: "couple", label: "Couple", icon: "heart" },
	{ value: "group", label: "Group", icon: "people" },
	{ value: "work", label: "Work", icon: "briefcase" },
	{ value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export const GROUP_COLORS = COLORS;
