// Muscle Body Map Types
import { MuscleGroup } from "../../types/workout";

export interface MuscleBodyMapProps {
	gender: "male" | "female";
	highlightedMuscles?: Partial<Record<MuscleGroup, number>>; // 0-100 intensity
	onMusclePress?: (muscle: MuscleGroup) => void;
	width?: number;
	height?: number;
	showLabels?: boolean;
	theme: {
		text: string;
		textMuted: string;
		background: string;
		surface: string;
		success?: string;
	};
	view: "front" | "back";
}

export interface MusclePath {
	path: string;
	muscle: MuscleGroup;
}

export type MusclePathRecord = Record<string, MusclePath>;
