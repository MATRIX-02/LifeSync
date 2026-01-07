// NutriPlan Constants
import type {
	BristolStoolType,
	FastingType,
	GutSymptom,
} from "@/src/types/nutrition";

export const GUT_SYMPTOMS: { id: GutSymptom; label: string; icon: string }[] = [
	{ id: "bloating", label: "Bloating", icon: "ellipse" },
	{ id: "gas", label: "Gas", icon: "cloud" },
	{ id: "cramps", label: "Cramps", icon: "flash" },
	{ id: "constipation", label: "Constipation", icon: "remove-circle" },
	{ id: "diarrhea", label: "Diarrhea", icon: "water" },
	{ id: "heartburn", label: "Heartburn", icon: "flame" },
	{ id: "nausea", label: "Nausea", icon: "medical" },
	{ id: "none", label: "No Issues", icon: "checkmark-circle" },
];

export const FASTING_PRESETS: {
	type: FastingType;
	label: string;
	hours: number;
	description: string;
}[] = [
	{
		type: "16_8",
		label: "16:8",
		hours: 16,
		description: "Fast 16 hours, eat within 8 hour window",
	},
	{
		type: "18_6",
		label: "18:6",
		hours: 18,
		description: "Fast 18 hours, eat within 6 hour window",
	},
	{
		type: "20_4",
		label: "20:4 (Warrior)",
		hours: 20,
		description: "Fast 20 hours, eat within 4 hour window",
	},
	{ type: "omad", label: "OMAD", hours: 23, description: "One Meal A Day" },
	{
		type: "eat_stop_eat",
		label: "24 Hour",
		hours: 24,
		description: "Full 24 hour fast",
	},
	{
		type: "custom",
		label: "Custom",
		hours: 0,
		description: "Set your own duration",
	},
];

export const WATER_AMOUNTS = [
	{ amount: 250, label: "Glass", icon: "water" },
	{ amount: 500, label: "Bottle", icon: "flask" },
	{ amount: 150, label: "Cup", icon: "cafe" },
	{ amount: 1000, label: "Liter", icon: "water" },
];

export const BRISTOL_SCALE_INFO: Record<
	BristolStoolType,
	{
		emoji: string;
		description: string;
		health: "good" | "concerning" | "alert";
	}
> = {
	1: {
		emoji: "🔴",
		description: "Separate hard lumps",
		health: "concerning",
	},
	2: {
		emoji: "🔴",
		description: "Lumpy and sausage-like",
		health: "concerning",
	},
	3: {
		emoji: "🟢",
		description: "Sausage with cracks",
		health: "good",
	},
	4: { emoji: "🟢", description: "Smooth and soft", health: "good" },
	5: {
		emoji: "🟡",
		description: "Soft blobs",
		health: "concerning",
	},
	6: { emoji: "🟡", description: "Fluffy pieces", health: "alert" },
	7: { emoji: "🟡", description: "Watery, no solid", health: "alert" },
};
